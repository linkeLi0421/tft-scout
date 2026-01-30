/**
 * Game State Parser
 * Parses TFT game information from screenshots
 */

import Tesseract, { createWorker, Worker } from 'tesseract.js';
import { Region } from '@nut-tree-fork/nut-js';
import { ScreenCapture, SimpleRegion } from '../capture/ScreenCapture.js';

/** Recognized unit information */
export interface RecognizedUnit {
    name: string | null;
    cost: number | null;
    starLevel?: number;
}

/** Shop information */
export interface ShopInfo {
    units: (RecognizedUnit | null)[];
    gold: number | null;
    level: number | null;
    xp: string | null;
}

/** Complete game state */
export interface GameState {
    stage: string | null;
    shop: ShopInfo;
    bench: (RecognizedUnit | null)[];
    timestamp: number;
}

/** Base resolution for region definitions */
const BASE_WIDTH = 1024;
const BASE_HEIGHT = 768;

/** Region definitions for 1024x768 resolution (will be scaled for other resolutions) */
const BASE_REGIONS = {
    // Stage indicator (top-center)
    stage: { leftTop: { x: 474, y: 5 }, rightBottom: { x: 550, y: 25 } },

    // Gold display
    gold: { leftTop: { x: 597, y: 730 }, rightBottom: { x: 646, y: 751 } },

    // Level display
    level: { leftTop: { x: 346, y: 728 }, rightBottom: { x: 395, y: 758 } },

    // Shop slots (5 slots)
    shopSlots: [
        { leftTop: { x: 343, y: 667 }, rightBottom: { x: 450, y: 700 } },
        { leftTop: { x: 453, y: 667 }, rightBottom: { x: 560, y: 700 } },
        { leftTop: { x: 563, y: 667 }, rightBottom: { x: 670, y: 700 } },
        { leftTop: { x: 673, y: 667 }, rightBottom: { x: 780, y: 700 } },
        { leftTop: { x: 783, y: 667 }, rightBottom: { x: 890, y: 700 } },
    ],

    // Bench slots (9 slots)
    benchSlots: [
        { leftTop: { x: 216, y: 545 }, rightBottom: { x: 280, y: 570 } },
        { leftTop: { x: 301, y: 545 }, rightBottom: { x: 365, y: 570 } },
        { leftTop: { x: 386, y: 545 }, rightBottom: { x: 450, y: 570 } },
        { leftTop: { x: 471, y: 545 }, rightBottom: { x: 535, y: 570 } },
        { leftTop: { x: 556, y: 545 }, rightBottom: { x: 620, y: 570 } },
        { leftTop: { x: 641, y: 545 }, rightBottom: { x: 705, y: 570 } },
        { leftTop: { x: 726, y: 545 }, rightBottom: { x: 790, y: 570 } },
        { leftTop: { x: 811, y: 545 }, rightBottom: { x: 875, y: 570 } },
        { leftTop: { x: 896, y: 545 }, rightBottom: { x: 960, y: 570 } },
    ],
};

/** Scale a region from base resolution to target resolution */
function scaleRegion(
    region: SimpleRegion,
    targetWidth: number,
    targetHeight: number
): SimpleRegion {
    const scaleX = targetWidth / BASE_WIDTH;
    const scaleY = targetHeight / BASE_HEIGHT;
    return {
        leftTop: {
            x: Math.round(region.leftTop.x * scaleX),
            y: Math.round(region.leftTop.y * scaleY),
        },
        rightBottom: {
            x: Math.round(region.rightBottom.x * scaleX),
            y: Math.round(region.rightBottom.y * scaleY),
        },
    };
}

export class GameStateParser {
    private ocrWorker: Worker | null = null;
    private windowWidth: number = BASE_WIDTH;
    private windowHeight: number = BASE_HEIGHT;

    /**
     * Set the game window dimensions for region scaling
     */
    setWindowSize(width: number, height: number): void {
        this.windowWidth = width;
        this.windowHeight = height;
        console.log(`[GameStateParser] Window size set to ${width}x${height}`);
    }

    /**
     * Get a scaled region based on current window size
     */
    private getScaledRegion(region: SimpleRegion): SimpleRegion {
        return scaleRegion(region, this.windowWidth, this.windowHeight);
    }

    async init(): Promise<void> {
        console.log('[GameStateParser] Initializing OCR worker...');

        this.ocrWorker = await createWorker('chi_sim+eng', 1, {
            logger: () => {}, // Suppress logs
        });

        console.log('[GameStateParser] OCR worker ready');
    }

    /**
     * Parse game state from screenshot (live capture mode)
     */
    async parse(screenshot: Buffer, screenCapture: ScreenCapture): Promise<GameState> {
        const gameState: GameState = {
            stage: null,
            shop: {
                units: [],
                gold: null,
                level: null,
                xp: null,
            },
            bench: [],
            timestamp: Date.now(),
        };

        try {
            // Parse stage
            gameState.stage = await this.parseStage(screenCapture);

            // Parse gold
            gameState.shop.gold = await this.parseGold(screenCapture);

            // Parse level
            const levelInfo = await this.parseLevel(screenCapture);
            gameState.shop.level = levelInfo.level;
            gameState.shop.xp = levelInfo.xp;

            // Parse shop units
            gameState.shop.units = await this.parseShop(screenCapture);

            // Parse bench units
            gameState.bench = await this.parseBench(screenCapture);

        } catch (error) {
            console.error('[GameStateParser] Parse error:', error);
        }

        return gameState;
    }

    /**
     * Parse game state from a pre-loaded screenshot buffer (replay mode)
     */
    async parseFromBuffer(screenshotBuffer: Buffer, screenCapture: ScreenCapture): Promise<GameState> {
        const gameState: GameState = {
            stage: null,
            shop: {
                units: [],
                gold: null,
                level: null,
                xp: null,
            },
            bench: [],
            timestamp: Date.now(),
        };

        try {
            // Parse stage from buffer
            gameState.stage = await this.parseRegionFromBuffer(screenshotBuffer, this.getScaledRegion(BASE_REGIONS.stage), screenCapture);

            // Parse gold from buffer
            const goldText = await this.parseRegionFromBuffer(screenshotBuffer, this.getScaledRegion(BASE_REGIONS.gold), screenCapture);
            const goldMatch = goldText?.match(/\d+/);
            gameState.shop.gold = goldMatch ? parseInt(goldMatch[0], 10) : null;

            // Parse level from buffer
            const levelText = await this.parseRegionFromBuffer(screenshotBuffer, this.getScaledRegion(BASE_REGIONS.level), screenCapture);
            const levelMatch = levelText?.match(/(\d+)/);
            const xpMatch = levelText?.match(/(\d+)\/(\d+)/);
            gameState.shop.level = levelMatch ? parseInt(levelMatch[1], 10) : null;
            gameState.shop.xp = xpMatch ? `${xpMatch[1]}/${xpMatch[2]}` : null;

            // Parse shop units from buffer
            for (let i = 0; i < BASE_REGIONS.shopSlots.length; i++) {
                const text = await this.parseRegionFromBuffer(screenshotBuffer, this.getScaledRegion(BASE_REGIONS.shopSlots[i]), screenCapture);
                if (text) {
                    gameState.shop.units.push({ name: text, cost: null });
                } else {
                    gameState.shop.units.push(null);
                }
            }

            // Parse bench units from buffer
            for (let i = 0; i < BASE_REGIONS.benchSlots.length; i++) {
                const text = await this.parseRegionFromBuffer(screenshotBuffer, this.getScaledRegion(BASE_REGIONS.benchSlots[i]), screenCapture);
                if (text) {
                    gameState.bench.push({ name: text, cost: null });
                } else {
                    gameState.bench.push(null);
                }
            }

        } catch (error) {
            console.error('[GameStateParser] Parse error:', error);
        }

        return gameState;
    }

    /**
     * Parse a region from a pre-loaded buffer
     */
    private async parseRegionFromBuffer(
        screenshotBuffer: Buffer,
        region: { leftTop: { x: number; y: number }; rightBottom: { x: number; y: number } },
        screenCapture: ScreenCapture
    ): Promise<string | null> {
        try {
            const png = await screenCapture.extractRegionFromBuffer(screenshotBuffer, region, true);
            const result = await this.ocrWorker!.recognize(png);
            const text = result.data.text.trim();
            return text || null;
        } catch {
            return null;
        }
    }

    private async parseStage(screenCapture: ScreenCapture): Promise<string | null> {
        try {
            const png = await screenCapture.captureGameRegionAsPng(this.getScaledRegion(BASE_REGIONS.stage), true);
            const result = await this.ocrWorker!.recognize(png);
            const text = result.data.text.trim();

            // Extract stage pattern like "1-1", "2-3", etc.
            const match = text.match(/(\d+)[-—](\d+)/);
            return match ? `${match[1]}-${match[2]}` : text || null;
        } catch {
            return null;
        }
    }

    private async parseGold(screenCapture: ScreenCapture): Promise<number | null> {
        try {
            const png = await screenCapture.captureGameRegionAsPng(this.getScaledRegion(BASE_REGIONS.gold), true);
            const result = await this.ocrWorker!.recognize(png);
            const text = result.data.text.trim();

            const match = text.match(/\d+/);
            return match ? parseInt(match[0], 10) : null;
        } catch {
            return null;
        }
    }

    private async parseLevel(screenCapture: ScreenCapture): Promise<{ level: number | null; xp: string | null }> {
        try {
            const png = await screenCapture.captureGameRegionAsPng(this.getScaledRegion(BASE_REGIONS.level), true);
            const result = await this.ocrWorker!.recognize(png);
            const text = result.data.text.trim();

            // Parse "Lv.5 4/20" format
            const levelMatch = text.match(/(\d+)/);
            const xpMatch = text.match(/(\d+)\/(\d+)/);

            return {
                level: levelMatch ? parseInt(levelMatch[1], 10) : null,
                xp: xpMatch ? `${xpMatch[1]}/${xpMatch[2]}` : null,
            };
        } catch {
            return { level: null, xp: null };
        }
    }

    private async parseShop(screenCapture: ScreenCapture): Promise<(RecognizedUnit | null)[]> {
        const units: (RecognizedUnit | null)[] = [];

        for (let i = 0; i < BASE_REGIONS.shopSlots.length; i++) {
            try {
                const png = await screenCapture.captureGameRegionAsPng(this.getScaledRegion(BASE_REGIONS.shopSlots[i]), true);
                const result = await this.ocrWorker!.recognize(png);
                const text = result.data.text.trim();

                if (text) {
                    units.push({
                        name: text,
                        cost: null, // Would need template matching for accurate cost detection
                    });
                } else {
                    units.push(null);
                }
            } catch {
                units.push(null);
            }
        }

        return units;
    }

    private async parseBench(screenCapture: ScreenCapture): Promise<(RecognizedUnit | null)[]> {
        const units: (RecognizedUnit | null)[] = [];

        for (let i = 0; i < BASE_REGIONS.benchSlots.length; i++) {
            try {
                const png = await screenCapture.captureGameRegionAsPng(this.getScaledRegion(BASE_REGIONS.benchSlots[i]), true);
                const result = await this.ocrWorker!.recognize(png);
                const text = result.data.text.trim();

                if (text) {
                    units.push({
                        name: text,
                        cost: null,
                    });
                } else {
                    units.push(null);
                }
            } catch {
                units.push(null);
            }
        }

        return units;
    }

    /**
     * Clean up resources
     */
    async destroy(): Promise<void> {
        if (this.ocrWorker) {
            await this.ocrWorker.terminate();
            this.ocrWorker = null;
        }
    }
}
