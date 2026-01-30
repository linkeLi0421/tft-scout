/**
 * TFT Scout - Main orchestrator
 * Handles hotkey registration, screen capture, and game state parsing
 */

import { screen, Region } from '@nut-tree-fork/nut-js';
import { HotkeyManager } from './hotkey/HotkeyManager.js';
import { ScreenCapture } from './capture/ScreenCapture.js';
import { GameStateParser, GameState } from './parser/GameStateParser.js';
import { DebugManager, DebugConfig } from './debug/DebugManager.js';
import { WindowFinder } from './window/WindowFinder.js';

/** Game window configuration */
export interface GameWindowConfig {
    /** Game window width (default: 1024) */
    width: number;
    /** Game window height (default: 768) */
    height: number;
    /** Game window X position (auto-detected if not set) */
    x?: number;
    /** Game window Y position (auto-detected if not set) */
    y?: number;
}

/** TFT Scout configuration */
export interface TftScoutConfig {
    gameWindow?: Partial<GameWindowConfig>;
    debug?: Partial<DebugConfig>;
    /** Auto-detect game window (default: true) */
    autoDetectWindow?: boolean;
}

/**
 * TFT Scout main class
 */
export class TftScout {
    private hotkeyManager: HotkeyManager;
    private screenCapture: ScreenCapture;
    private gameStateParser: GameStateParser;
    private gameWindowConfig: GameWindowConfig;
    private debugManager: DebugManager;
    private windowFinder: WindowFinder;
    private autoDetectWindow: boolean;

    constructor(config?: TftScoutConfig) {
        this.hotkeyManager = new HotkeyManager();
        this.screenCapture = new ScreenCapture();
        this.gameStateParser = new GameStateParser();
        this.debugManager = new DebugManager(config?.debug);
        this.windowFinder = new WindowFinder();
        this.autoDetectWindow = config?.autoDetectWindow ?? true;

        // Default to 1024x768 game resolution (will be overridden if auto-detect is enabled)
        this.gameWindowConfig = {
            width: config?.gameWindow?.width ?? 1024,
            height: config?.gameWindow?.height ?? 768,
            x: config?.gameWindow?.x,
            y: config?.gameWindow?.y,
        };
    }

    /**
     * Initialize the scout tool
     */
    async init(): Promise<void> {
        console.log('[TftScout] Initializing...');

        // Get screen size
        const screenWidth = await screen.width();
        const screenHeight = await screen.height();
        console.log(`[TftScout] Screen size: ${screenWidth}x${screenHeight}`);

        // Try to auto-detect TFT window
        if (this.autoDetectWindow) {
            const windowInfo = await this.windowFinder.findTftWindow();
            if (windowInfo) {
                this.gameWindowConfig.width = windowInfo.width;
                this.gameWindowConfig.height = windowInfo.height;
                this.gameWindowConfig.x = windowInfo.x;
                this.gameWindowConfig.y = windowInfo.y;
                console.log(`[TftScout] Auto-detected game window: ${windowInfo.width}x${windowInfo.height} at (${windowInfo.x}, ${windowInfo.y})`);
            } else {
                console.log('[TftScout] Could not auto-detect TFT window, using defaults');
                // Fall back to centered position
                if (this.gameWindowConfig.x === undefined || this.gameWindowConfig.y === undefined) {
                    this.gameWindowConfig.x = Math.floor((screenWidth - this.gameWindowConfig.width) / 2);
                    this.gameWindowConfig.y = Math.floor((screenHeight - this.gameWindowConfig.height) / 2);
                }
            }
        } else {
            // Calculate game window position (centered if not specified)
            if (this.gameWindowConfig.x === undefined || this.gameWindowConfig.y === undefined) {
                this.gameWindowConfig.x = Math.floor((screenWidth - this.gameWindowConfig.width) / 2);
                this.gameWindowConfig.y = Math.floor((screenHeight - this.gameWindowConfig.height) / 2);
            }
        }

        console.log(`[TftScout] Game window: ${this.gameWindowConfig.width}x${this.gameWindowConfig.height} at (${this.gameWindowConfig.x}, ${this.gameWindowConfig.y})`);

        // Set game window origin for screen capture
        this.screenCapture.setGameWindowOrigin({
            x: this.gameWindowConfig.x,
            y: this.gameWindowConfig.y,
        });

        // Initialize parser (loads OCR workers, templates, etc.)
        await this.gameStateParser.init();

        // Set parser window size for region scaling
        this.gameStateParser.setWindowSize(this.gameWindowConfig.width, this.gameWindowConfig.height);

        // Initialize debug session if enabled
        if (this.debugManager.isEnabled()) {
            this.debugManager.initSession({
                width: this.gameWindowConfig.width,
                height: this.gameWindowConfig.height,
                x: this.gameWindowConfig.x!,
                y: this.gameWindowConfig.y!,
            });
        }

        // Start hotkey manager
        this.hotkeyManager.start();

        console.log('[TftScout] Initialization complete!');
    }

    /**
     * Register a hotkey to trigger game state capture
     */
    registerHotkey(accelerator: string, callback: () => void | Promise<void>): boolean {
        return this.hotkeyManager.register(accelerator, callback);
    }

    /**
     * Capture screen and parse game state
     */
    async captureAndParse(): Promise<GameState> {
        // Capture full game window
        const region = new Region(
            this.gameWindowConfig.x!,
            this.gameWindowConfig.y!,
            this.gameWindowConfig.width,
            this.gameWindowConfig.height
        );

        console.log('[TftScout] Capturing screen...');
        const screenshot = await this.screenCapture.captureRegion(region);

        console.log('[TftScout] Parsing game state...');
        const gameState = await this.gameStateParser.parse(screenshot, this.screenCapture);

        // Save debug data if enabled
        if (this.debugManager.isEnabled()) {
            await this.debugManager.saveCapture(screenshot, gameState);
        }

        return gameState;
    }

    /**
     * Capture a specific region of the game window
     */
    async captureGameRegion(relativeRegion: { x: number; y: number; width: number; height: number }): Promise<Buffer> {
        const absoluteRegion = new Region(
            this.gameWindowConfig.x! + relativeRegion.x,
            this.gameWindowConfig.y! + relativeRegion.y,
            relativeRegion.width,
            relativeRegion.height
        );

        return this.screenCapture.captureRegionAsPng(absoluteRegion);
    }

    /**
     * Stop the scout tool
     */
    stop(): void {
        this.hotkeyManager.stop();
        console.log('[TftScout] Stopped');
    }
}
