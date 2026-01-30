/**
 * Window Finder - Auto-detect TFT game window
 */

import { getWindows, Window } from '@nut-tree-fork/nut-js';

export interface WindowInfo {
    title: string;
    x: number;
    y: number;
    width: number;
    height: number;
}

// Known TFT window title patterns
const TFT_TITLE_PATTERNS = [
    /teamfight tactics/i,
    /云顶之弈/,  // Chinese
    /tft/i,
    /league.*client/i,
];

export class WindowFinder {
    /**
     * Find TFT game window automatically
     */
    async findTftWindow(): Promise<WindowInfo | null> {
        try {
            const windows = await getWindows();

            for (const window of windows) {
                const title = await window.getTitle();

                for (const pattern of TFT_TITLE_PATTERNS) {
                    if (pattern.test(title)) {
                        const region = await window.getRegion();
                        console.log(`[WindowFinder] Found TFT window: "${title}"`);
                        console.log(`[WindowFinder] Position: (${region.left}, ${region.top}), Size: ${region.width}x${region.height}`);

                        return {
                            title,
                            x: region.left,
                            y: region.top,
                            width: region.width,
                            height: region.height,
                        };
                    }
                }
            }

            console.log('[WindowFinder] TFT window not found');
            return null;
        } catch (error) {
            console.error('[WindowFinder] Error finding window:', error);
            return null;
        }
    }

    /**
     * List all windows (for debugging)
     */
    async listAllWindows(): Promise<WindowInfo[]> {
        const windows = await getWindows();
        const result: WindowInfo[] = [];

        for (const window of windows) {
            try {
                const title = await window.getTitle();
                if (!title) continue;

                const region = await window.getRegion();
                result.push({
                    title,
                    x: region.left,
                    y: region.top,
                    width: region.width,
                    height: region.height,
                });
            } catch {
                // Skip windows that can't be queried
            }
        }

        return result;
    }
}
