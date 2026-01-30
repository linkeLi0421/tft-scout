/**
 * TFT Scout - Main Entry Point
 * Press hotkey to capture screen and parse game state
 *
 * CLI Flags:
 *   --debug          Enable debug mode (saves screenshots and results)
 *   --debug-regions  Also save individual region crops
 *   --replay <path>  Replay a saved session
 */

import { TftScout } from './TftScout.js';
import { ReplayManager } from './replay/ReplayManager.js';

interface CliArgs {
    debug: boolean;
    debugRegions: boolean;
    replayPath: string | null;
}

function parseArgs(): CliArgs {
    const args = process.argv.slice(2);
    const result: CliArgs = {
        debug: false,
        debugRegions: false,
        replayPath: null,
    };

    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        if (arg === '--debug') {
            result.debug = true;
        } else if (arg === '--debug-regions') {
            result.debugRegions = true;
            result.debug = true; // Implies debug mode
        } else if (arg === '--replay') {
            result.replayPath = args[i + 1] || null;
            i++; // Skip the path argument
        }
    }

    return result;
}

async function runReplay(sessionPath: string): Promise<void> {
    console.log('='.repeat(50));
    console.log('TFT Scout - Replay Mode');
    console.log('='.repeat(50));
    console.log(`\nReplaying session: ${sessionPath}\n`);

    const replay = new ReplayManager(sessionPath);
    await replay.init();

    const manifest = replay.getManifest();
    if (!manifest) {
        console.error('Failed to load session manifest');
        return;
    }

    console.log(`Session: ${manifest.sessionId}`);
    console.log(`Captures: ${manifest.captures.length}`);
    console.log(`Game window: ${manifest.gameWindowConfig.width}x${manifest.gameWindowConfig.height}`);
    console.log('\n' + '-'.repeat(50) + '\n');

    const results = await replay.replayAll();

    for (const result of results) {
        console.log('\n=== Original ===');
        console.log(JSON.stringify(result.original, null, 2));
        console.log('\n=== Reparsed ===');
        console.log(JSON.stringify(result.reparsed, null, 2));
        console.log('\n' + '-'.repeat(50));
    }

    await replay.destroy();
    console.log('\nReplay complete!');
}

async function runLive(cliArgs: CliArgs): Promise<void> {
    console.log('='.repeat(50));
    console.log('TFT Scout - Game State Parser');
    if (cliArgs.debug) {
        console.log('DEBUG MODE ENABLED');
        if (cliArgs.debugRegions) {
            console.log('Region crops will be saved');
        }
    }
    console.log('='.repeat(50));

    const scout = new TftScout({
        debug: {
            enabled: cliArgs.debug,
            saveRegionCrops: cliArgs.debugRegions,
        },
    });

    // Initialize
    await scout.init();

    // Register hotkey (F3 by default)
    scout.registerHotkey('F3', async () => {
        console.log('\n[Scout] Hotkey triggered! Capturing game state...');

        try {
            const gameState = await scout.captureAndParse();

            console.log('\n=== Game State ===');
            console.log(JSON.stringify(gameState, null, 2));
            console.log('==================\n');
        } catch (error) {
            console.error('[Scout] Error:', error);
        }
    });

    console.log('\nPress F3 to capture and parse TFT game state');
    console.log('Press Ctrl+C to exit\n');

    // Keep process alive
    process.on('SIGINT', () => {
        console.log('\nShutting down...');
        scout.stop();
        process.exit(0);
    });
}

async function main() {
    const cliArgs = parseArgs();

    if (cliArgs.replayPath) {
        await runReplay(cliArgs.replayPath);
    } else {
        await runLive(cliArgs);
    }
}

main().catch(console.error);
