/**
 * Global Hotkey Manager
 * Uses uiohook-napi for low-level keyboard hooks that work in fullscreen games
 */

import { uIOhook, UiohookKey } from 'uiohook-napi';

/** Key code to name mapping */
const keyCodeToName: Record<number, string> = {
    [UiohookKey.F1]: 'F1', [UiohookKey.F2]: 'F2', [UiohookKey.F3]: 'F3',
    [UiohookKey.F4]: 'F4', [UiohookKey.F5]: 'F5', [UiohookKey.F6]: 'F6',
    [UiohookKey.F7]: 'F7', [UiohookKey.F8]: 'F8', [UiohookKey.F9]: 'F9',
    [UiohookKey.F10]: 'F10', [UiohookKey.F11]: 'F11', [UiohookKey.F12]: 'F12',
    [UiohookKey['0']]: '0', [UiohookKey['1']]: '1', [UiohookKey['2']]: '2',
    [UiohookKey['3']]: '3', [UiohookKey['4']]: '4', [UiohookKey['5']]: '5',
    [UiohookKey['6']]: '6', [UiohookKey['7']]: '7', [UiohookKey['8']]: '8',
    [UiohookKey['9']]: '9',
    [UiohookKey.A]: 'A', [UiohookKey.B]: 'B', [UiohookKey.C]: 'C',
    [UiohookKey.D]: 'D', [UiohookKey.E]: 'E', [UiohookKey.F]: 'F',
    [UiohookKey.G]: 'G', [UiohookKey.H]: 'H', [UiohookKey.I]: 'I',
    [UiohookKey.J]: 'J', [UiohookKey.K]: 'K', [UiohookKey.L]: 'L',
    [UiohookKey.M]: 'M', [UiohookKey.N]: 'N', [UiohookKey.O]: 'O',
    [UiohookKey.P]: 'P', [UiohookKey.Q]: 'Q', [UiohookKey.R]: 'R',
    [UiohookKey.S]: 'S', [UiohookKey.T]: 'T', [UiohookKey.U]: 'U',
    [UiohookKey.V]: 'V', [UiohookKey.W]: 'W', [UiohookKey.X]: 'X',
    [UiohookKey.Y]: 'Y', [UiohookKey.Z]: 'Z',
    [UiohookKey.Space]: 'SPACE', [UiohookKey.Tab]: 'TAB',
    [UiohookKey.Enter]: 'ENTER',
};

interface ParsedAccelerator {
    ctrl: boolean;
    alt: boolean;
    shift: boolean;
    key: string;
}

type HotkeyCallback = () => void | Promise<void>;

interface RegisteredHotkey {
    callback: HotkeyCallback;
    parsed: ParsedAccelerator;
}

export class HotkeyManager {
    private isStarted = false;
    private modifierState = { ctrl: false, alt: false, shift: false };
    private hotkeyMap = new Map<string, RegisteredHotkey>();

    private parseAccelerator(accelerator: string): ParsedAccelerator {
        const parts = accelerator.split('+');
        const result: ParsedAccelerator = { ctrl: false, alt: false, shift: false, key: '' };

        for (const part of parts) {
            const lower = part.toLowerCase();
            if (lower === 'ctrl' || lower === 'control') result.ctrl = true;
            else if (lower === 'alt') result.alt = true;
            else if (lower === 'shift') result.shift = true;
            else result.key = part.toUpperCase();
        }
        return result;
    }

    private matchHotkey(keyCode: number, parsed: ParsedAccelerator): boolean {
        const keyName = keyCodeToName[keyCode];
        if (!keyName) return false;

        return (
            this.modifierState.ctrl === parsed.ctrl &&
            this.modifierState.alt === parsed.alt &&
            this.modifierState.shift === parsed.shift &&
            keyName === parsed.key
        );
    }

    start(): void {
        if (this.isStarted) return;

        uIOhook.on('keydown', (e) => {
            // Update modifier state
            if (e.keycode === UiohookKey.Ctrl || e.keycode === UiohookKey.CtrlRight) {
                this.modifierState.ctrl = true;
                return;
            }
            if (e.keycode === UiohookKey.Alt || e.keycode === UiohookKey.AltRight) {
                this.modifierState.alt = true;
                return;
            }
            if (e.keycode === UiohookKey.Shift || e.keycode === UiohookKey.ShiftRight) {
                this.modifierState.shift = true;
                return;
            }

            // Check registered hotkeys
            for (const [accelerator, { callback, parsed }] of this.hotkeyMap) {
                if (this.matchHotkey(e.keycode, parsed)) {
                    console.log(`[HotkeyManager] Hotkey ${accelerator} triggered`);
                    callback();
                    break;
                }
            }
        });

        uIOhook.on('keyup', (e) => {
            if (e.keycode === UiohookKey.Ctrl || e.keycode === UiohookKey.CtrlRight) {
                this.modifierState.ctrl = false;
            }
            if (e.keycode === UiohookKey.Alt || e.keycode === UiohookKey.AltRight) {
                this.modifierState.alt = false;
            }
            if (e.keycode === UiohookKey.Shift || e.keycode === UiohookKey.ShiftRight) {
                this.modifierState.shift = false;
            }
        });

        uIOhook.start();
        this.isStarted = true;
        console.log('[HotkeyManager] Started');
    }

    stop(): void {
        if (!this.isStarted) return;
        uIOhook.stop();
        this.isStarted = false;
        this.hotkeyMap.clear();
        console.log('[HotkeyManager] Stopped');
    }

    register(accelerator: string, callback: HotkeyCallback): boolean {
        const parsed = this.parseAccelerator(accelerator);
        if (!parsed.key) {
            console.error(`[HotkeyManager] Invalid accelerator: ${accelerator}`);
            return false;
        }

        if (!this.isStarted) this.start();

        this.hotkeyMap.set(accelerator, { callback, parsed });
        console.log(`[HotkeyManager] Registered hotkey: ${accelerator}`);
        return true;
    }

    unregister(accelerator: string): void {
        this.hotkeyMap.delete(accelerator);
    }
}
