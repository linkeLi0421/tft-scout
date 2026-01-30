/**
 * Replay Manager - Loads and replays saved debug sessions
 */

import * as fs from 'fs';
import * as path from 'path';
import { GameStateParser, GameState } from '../parser/GameStateParser.js';
import { ScreenCapture } from '../capture/ScreenCapture.js';
import { SessionManifest, CaptureMetadata } from '../debug/DebugManager.js';

export interface ReplayResult {
    original: GameState;
    reparsed: GameState;
    screenshotPath: string;
}

export class ReplayManager {
    private sessionPath: string;
    private manifest: SessionManifest | null = null;
    private parser: GameStateParser;
    private screenCapture: ScreenCapture;

    constructor(sessionPath: string) {
        this.sessionPath = sessionPath;
        this.parser = new GameStateParser();
        this.screenCapture = new ScreenCapture();
    }

    /**
     * Initialize the replay manager
     */
    async init(): Promise<void> {
        // Load manifest
        const manifestPath = path.join(this.sessionPath, 'manifest.json');
        if (!fs.existsSync(manifestPath)) {
            throw new Error(`Manifest not found: ${manifestPath}`);
        }

        const manifestContent = fs.readFileSync(manifestPath, 'utf-8');
        this.manifest = JSON.parse(manifestContent) as SessionManifest;

        // Set up screen capture with saved game window config
        this.screenCapture.setGameWindowOrigin({
            x: this.manifest.gameWindowConfig.x,
            y: this.manifest.gameWindowConfig.y,
        });

        // Initialize parser
        await this.parser.init();

        console.log(`[ReplayManager] Loaded session: ${this.manifest.sessionId}`);
        console.log(`[ReplayManager] Contains ${this.manifest.captures.length} captures`);
    }

    /**
     * Get the session manifest
     */
    getManifest(): SessionManifest | null {
        return this.manifest;
    }

    /**
     * Replay all captures and re-parse them
     */
    async replayAll(): Promise<ReplayResult[]> {
        if (!this.manifest) {
            throw new Error('ReplayManager not initialized');
        }

        const results: ReplayResult[] = [];

        for (const capture of this.manifest.captures) {
            const result = await this.replayCapture(capture);
            results.push(result);
        }

        return results;
    }

    /**
     * Replay a single capture
     */
    async replayCapture(capture: CaptureMetadata): Promise<ReplayResult> {
        const screenshotPath = path.join(this.sessionPath, capture.filename);
        const screenshot = await this.screenCapture.loadScreenshot(screenshotPath);

        console.log(`[ReplayManager] Replaying capture ${capture.index}...`);

        // Re-parse with current parser logic
        const reparsed = await this.parser.parseFromBuffer(screenshot, this.screenCapture);

        return {
            original: capture.gameState,
            reparsed,
            screenshotPath,
        };
    }

    /**
     * Replay by index (1-based)
     */
    async replayByIndex(index: number): Promise<ReplayResult> {
        if (!this.manifest) {
            throw new Error('ReplayManager not initialized');
        }

        const capture = this.manifest.captures.find(c => c.index === index);
        if (!capture) {
            throw new Error(`Capture ${index} not found`);
        }

        return this.replayCapture(capture);
    }

    /**
     * Clean up resources
     */
    async destroy(): Promise<void> {
        await this.parser.destroy();
    }
}
