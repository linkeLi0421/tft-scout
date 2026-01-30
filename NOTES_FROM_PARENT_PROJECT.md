# Notes from TFT-Hextech-Helper Session

These notes capture key findings from debugging and analyzing the parent project.

## Vanguard Anti-Cheat Findings

### The Problem
- **NA/EU/KR servers** use Riot Vanguard anti-cheat
- Vanguard **blocks mouse automation** (nut-js `mouse.move()` and `mouse.setPosition()`)
- Mouse commands complete successfully in code but cursor doesn't physically move
- **Chinese servers** don't have Vanguard - full automation works there

### What Works vs Doesn't Work with Vanguard

| Feature | Works? | Notes |
|---------|--------|-------|
| Screenshot capture | ✅ | `screen.grabRegion()` works fine |
| OCR recognition | ✅ | Tesseract can read game text |
| Template matching | ✅ | OpenCV matching works |
| Global hotkeys | ✅ | uiohook-napi works in fullscreen |
| Mouse move/click | ❌ | Blocked by Vanguard during gameplay |
| Mouse in lobby | ✅ | Works before game starts |
| Mouse after game | ✅ | Works after match ends |

### macOS Difference
- Vanguard on macOS is **user-space only** (Apple restricts kernel extensions)
- Mouse automation **might work** on macOS NA server (untested)

## Mouse Controller Findings

### mouse.move() vs mouse.setPosition()
- `mouse.move([point])` - Animated movement, was being blocked
- `mouse.setPosition(point)` - Direct teleport, also blocked by Vanguard
- Both complete without errors but cursor doesn't move

### Code Change Made
Changed all `mouse.move()` to `mouse.setPosition()` in MouseController.ts (didn't help with Vanguard but cleaner approach).

## Key Files in Parent Project

### Recognition Pipeline
```
ScreenCapture.ts → OcrService.ts → TemplateMatcher.ts
                 ↓
              TftOperator.ts (coordinates all recognition)
```

### Important Coordinates (1024x768)
All UI element positions are defined in `TFTProtocol.ts`:
- Shop slots, bench slots, board positions
- Gold/level display areas
- Stage indicator position

### Template Images Location
```
public/resources/assets/images/
├── champion/        # 92 champion portraits
├── equipment/       # Items by category (component, core, emblem, artifact, radiant)
├── benchSlot/       # Bench slot templates
└── button/          # UI button templates
```

## OCR Configuration

### Tesseract Workers
Parent project creates multiple specialized workers:
- `gameStageWorker` - Reads stage like "3-2"
- `combatStageWorker` - Reads combat state
- `unitNameWorker` - Reads champion names
- `levelWorker` - Reads level/XP

### Image Preprocessing for OCR
```typescript
sharp(buffer)
    .resize({ width: width * 3, height: height * 3 })  // 3x scale
    .grayscale()
    .normalize()
    .threshold(160)
    .sharpen()
```

## DevTools Access

Added to `electron/main.ts` to enable F12 in production:
```typescript
win.webContents.on('before-input-event', (event, input) => {
    if ((input.control && input.shift && input.key.toLowerCase() === 'i') || input.key === 'F12') {
        win?.webContents.toggleDevTools();
        event.preventDefault();
    }
});
```

## Terminal Encoding (Windows)

For Chinese character display:
```powershell
chcp 65001  # Set UTF-8 encoding
```

Or in PowerShell:
```powershell
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
```

## Admin Requirements

Must run as Administrator for:
- `uiohook-napi` (global hotkeys)
- `@nut-tree-fork/nut-js` (mouse/screen capture)

## Build Commands

```bash
npm run dev          # Development with hot reload
npm run build        # TypeScript check + electron-vite build
npx electron-vite build  # Skip typecheck (faster)
npx electron .       # Run built app
```
