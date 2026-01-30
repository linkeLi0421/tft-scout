/**
 * Screen Capture Module
 * Handles screenshot capture and image preprocessing
 */

import { Region, screen as nutScreen } from '@nut-tree-fork/nut-js';
import sharp from 'sharp';
import cv from '@techstark/opencv-js';
import * as fs from 'fs';

export interface SimplePoint {
    x: number;
    y: number;
}

export interface SimpleRegion {
    leftTop: SimplePoint;
    rightBottom: SimplePoint;
}

export class ScreenCapture {
    private gameWindowOrigin: SimplePoint | null = null;

    setGameWindowOrigin(origin: SimplePoint): void {
        this.gameWindowOrigin = origin;
        console.log(`[ScreenCapture] Game window origin set: (${origin.x}, ${origin.y})`);
    }

    getGameWindowOrigin(): SimplePoint | null {
        return this.gameWindowOrigin;
    }

    /**
     * Convert game-relative region to absolute screen region
     */
    toAbsoluteRegion(simpleRegion: SimpleRegion): Region {
        if (!this.gameWindowOrigin) {
            throw new Error('[ScreenCapture] Game window origin not set');
        }

        return new Region(
            this.gameWindowOrigin.x + simpleRegion.leftTop.x,
            this.gameWindowOrigin.y + simpleRegion.leftTop.y,
            simpleRegion.rightBottom.x - simpleRegion.leftTop.x,
            simpleRegion.rightBottom.y - simpleRegion.leftTop.y
        );
    }

    /**
     * Capture a screen region
     */
    async captureRegion(region: Region): Promise<Buffer> {
        const screenshot = await nutScreen.grabRegion(region);

        // Convert BGRA to RGBA
        const mat = new cv.Mat(screenshot.height, screenshot.width, cv.CV_8UC4);
        mat.data.set(new Uint8Array(screenshot.data));
        cv.cvtColor(mat, mat, cv.COLOR_BGRA2RGBA);

        const rgbaBuffer = Buffer.from(mat.data);
        mat.delete();

        return sharp(rgbaBuffer, {
            raw: {
                width: screenshot.width,
                height: screenshot.height,
                channels: 4,
            },
        }).png().toBuffer();
    }

    /**
     * Capture a region and preprocess for OCR
     */
    async captureRegionAsPng(region: Region, forOCR: boolean = false): Promise<Buffer> {
        const screenshot = await nutScreen.grabRegion(region);

        const mat = new cv.Mat(screenshot.height, screenshot.width, cv.CV_8UC4);
        mat.data.set(new Uint8Array(screenshot.data));
        cv.cvtColor(mat, mat, cv.COLOR_BGRA2RGBA);

        const rgbaBuffer = Buffer.from(mat.data);
        mat.delete();

        let pipeline = sharp(rgbaBuffer, {
            raw: {
                width: screenshot.width,
                height: screenshot.height,
                channels: 4,
            },
        });

        if (forOCR) {
            // OCR preprocessing: scale up, grayscale, threshold, sharpen
            pipeline = pipeline
                .resize({
                    width: Math.round(screenshot.width * 3),
                    height: Math.round(screenshot.height * 3),
                    kernel: 'lanczos3',
                })
                .grayscale()
                .normalize()
                .threshold(160)
                .sharpen();
        }

        return pipeline.png().toBuffer();
    }

    /**
     * Capture game-relative region
     */
    async captureGameRegionAsPng(simpleRegion: SimpleRegion, forOCR: boolean = false): Promise<Buffer> {
        const absoluteRegion = this.toAbsoluteRegion(simpleRegion);
        return this.captureRegionAsPng(absoluteRegion, forOCR);
    }

    /**
     * Capture region as OpenCV Mat
     */
    async captureRegionAsMat(region: Region): Promise<cv.Mat> {
        const screenshot = await nutScreen.grabRegion(region);

        const mat = new cv.Mat(screenshot.height, screenshot.width, cv.CV_8UC4);
        mat.data.set(new Uint8Array(screenshot.data));
        cv.cvtColor(mat, mat, cv.COLOR_BGRA2RGB);

        return mat;
    }

    /**
     * Load a screenshot from file (for replay mode)
     */
    async loadScreenshot(filePath: string): Promise<Buffer> {
        return fs.promises.readFile(filePath);
    }

    /**
     * Extract a region from a pre-loaded screenshot buffer
     */
    async extractRegionFromBuffer(
        screenshotBuffer: Buffer,
        simpleRegion: SimpleRegion,
        forOCR: boolean = false
    ): Promise<Buffer> {
        const x = simpleRegion.leftTop.x;
        const y = simpleRegion.leftTop.y;
        const width = simpleRegion.rightBottom.x - simpleRegion.leftTop.x;
        const height = simpleRegion.rightBottom.y - simpleRegion.leftTop.y;

        let pipeline = sharp(screenshotBuffer)
            .extract({ left: x, top: y, width, height });

        if (forOCR) {
            pipeline = pipeline
                .resize({
                    width: Math.round(width * 3),
                    height: Math.round(height * 3),
                    kernel: 'lanczos3',
                })
                .grayscale()
                .normalize()
                .threshold(160)
                .sharpen();
        }

        return pipeline.png().toBuffer();
    }
}
