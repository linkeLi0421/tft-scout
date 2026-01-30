/**
 * Debug Manager - Handles saving debug data for replay
 */

import * as fs from 'fs';
import * as path from 'path';
import { GameState } from '../parser/GameStateParser.js';

export interface DebugConfig {
    enabled: boolean;
    outputDir: string;
    saveRegionCrops: boolean;
}

export interface CaptureMetadata {
    index: number;
    filename: string;
    capturedAt: number;
    gameState: GameState;
}

export interface SessionManifest {
    sessionId: string;
    createdAt: number;
    gameWindowConfig: {
        width: number;
        height: number;
        x: number;
        y: number;
    };
    captures: CaptureMetadata[];
}

export class DebugManager {
    private config: DebugConfig;
    private sessionDir: string | null = null;
    private regionsDir: string | null = null;
    private manifest: SessionManifest | null = null;
    private captureIndex: number = 0;

    constructor(config: Partial<DebugConfig> = {}) {
        this.config = {
            enabled: config.enabled ?? false,
            outputDir: config.outputDir ?? './debug',
            saveRegionCrops: config.saveRegionCrops ?? false,
        };
    }

    isEnabled(): boolean {
        return this.config.enabled;
    }

    shouldSaveRegions(): boolean {
        return this.config.saveRegionCrops;
    }

    /**
     * Initialize a new debug session
     */
    initSession(gameWindowConfig: { width: number; height: number; x: number; y: number }): void {
        if (!this.config.enabled) return;

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const sessionId = `session-${timestamp}`;
        this.sessionDir = path.join(this.config.outputDir, sessionId);
        this.regionsDir = path.join(this.sessionDir, 'regions');

        // Create directories
        fs.mkdirSync(this.sessionDir, { recursive: true });
        if (this.config.saveRegionCrops) {
            fs.mkdirSync(this.regionsDir, { recursive: true });
        }

        // Initialize manifest
        this.manifest = {
            sessionId,
            createdAt: Date.now(),
            gameWindowConfig,
            captures: [],
        };

        this.captureIndex = 0;
        console.log(`[DebugManager] Session initialized: ${this.sessionDir}`);
    }

    /**
     * Save a capture (screenshot + parsed result)
     */
    async saveCapture(screenshot: Buffer, gameState: GameState): Promise<void> {
        if (!this.config.enabled || !this.sessionDir || !this.manifest) return;

        this.captureIndex++;
        const paddedIndex = String(this.captureIndex).padStart(3, '0');
        const filename = `capture-${paddedIndex}.png`;
        const jsonFilename = `capture-${paddedIndex}.json`;

        // Save screenshot
        const screenshotPath = path.join(this.sessionDir, filename);
        fs.writeFileSync(screenshotPath, screenshot);

        // Save individual result JSON
        const resultPath = path.join(this.sessionDir, jsonFilename);
        fs.writeFileSync(resultPath, JSON.stringify(gameState, null, 2));

        // Update manifest
        const metadata: CaptureMetadata = {
            index: this.captureIndex,
            filename,
            capturedAt: gameState.timestamp,
            gameState,
        };
        this.manifest.captures.push(metadata);

        // Update manifest file
        this.saveManifest();

        console.log(`[DebugManager] Saved capture ${this.captureIndex}: ${filename}`);
    }

    /**
     * Save a region crop (for OCR debugging)
     */
    async saveRegionCrop(regionName: string, buffer: Buffer): Promise<void> {
        if (!this.config.enabled || !this.config.saveRegionCrops || !this.regionsDir) return;

        const paddedIndex = String(this.captureIndex).padStart(3, '0');
        const filename = `capture-${paddedIndex}-${regionName}.png`;
        const filePath = path.join(this.regionsDir, filename);

        fs.writeFileSync(filePath, buffer);
    }

    /**
     * Save the session manifest
     */
    private saveManifest(): void {
        if (!this.sessionDir || !this.manifest) return;

        const manifestPath = path.join(this.sessionDir, 'manifest.json');
        fs.writeFileSync(manifestPath, JSON.stringify(this.manifest, null, 2));
    }

    /**
     * Get the current session directory
     */
    getSessionDir(): string | null {
        return this.sessionDir;
    }

    /**
     * Get current capture index (for region naming)
     */
    getCurrentCaptureIndex(): number {
        return this.captureIndex;
    }
}
