# TFT Scout

A read-only TFT game state parser that captures screenshots and extracts game information.

**No mouse control** - works with Vanguard anti-cheat!

## Features

- **Hotkey-triggered capture** - Press F3 (configurable) to capture game state
- **OCR recognition** - Reads champion names, gold, level, stage
- **Works in fullscreen** - Uses low-level keyboard hooks
- **No automation** - Read-only, doesn't control mouse/keyboard in game

## Installation

```bash
cd tft-scout
npm install
```

## Usage

```bash
# Build
npm run build

# Run
npm start
```

Press **F3** while in a TFT game to capture and parse the current game state.

## Output Example

```json
{
  "stage": "3-2",
  "shop": {
    "units": [
      { "name": "崔丝塔娜", "cost": null },
      { "name": "厄斐琉斯", "cost": null },
      ...
    ],
    "gold": 45,
    "level": 6,
    "xp": "12/24"
  },
  "bench": [...],
  "timestamp": 1706540123456
}
```

## Requirements

- Node.js 18+
- Windows (for uiohook-napi)
- TFT running at 1024x768 resolution (borderless/windowed)

## Customization

### Change Hotkey

Edit `src/main.ts`:
```typescript
scout.registerHotkey('F5', async () => { ... });
```

### Change Game Resolution

```typescript
const scout = new TftScout({
    width: 1920,
    height: 1080,
    x: 0,  // Optional: specify game window position
    y: 0,
});
```

## Architecture

```
tft-scout/
├── src/
│   ├── main.ts              # Entry point
│   ├── TftScout.ts          # Main orchestrator
│   ├── hotkey/
│   │   └── HotkeyManager.ts # Global hotkey handling
│   ├── capture/
│   │   └── ScreenCapture.ts # Screenshot capture
│   └── parser/
│       └── GameStateParser.ts # OCR and parsing
```

## Extending

To add template matching for more accurate champion/item recognition, you can:

1. Copy `TemplateMatcher.ts` and `TemplateLoader.ts` from the original project
2. Add template images to `resources/templates/`
3. Integrate template matching in `GameStateParser.ts`

## License

MIT
