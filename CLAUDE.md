# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

TFT Scout is a **read-only** TFT game state parser extracted from [TFT-Hextech-Helper](../TFT-Hextech-Helper/). It captures screenshots on hotkey press and parses game information using OCR and template matching.

**Key difference from parent project:** No mouse/keyboard automation - works with Vanguard anti-cheat on NA/EU servers.

## Build & Run Commands

```bash
npm install          # Install dependencies
npm run build        # Compile TypeScript
npm start            # Run the tool
```

## Architecture

```
src/
├── main.ts              # Entry point, registers F3 hotkey
├── TftScout.ts          # Main orchestrator class
├── hotkey/
│   └── HotkeyManager.ts # uiohook-napi keyboard hooks (works in fullscreen)
├── capture/
│   └── ScreenCapture.ts # nut-js screen capture + sharp preprocessing
└── parser/
    └── GameStateParser.ts # Tesseract OCR parsing
```

## Key Components

| Component | Purpose | Original Source |
|-----------|---------|-----------------|
| `HotkeyManager` | Global hotkeys that work in fullscreen | `../TFT-Hextech-Helper/src-backend/utils/GlobalHotkeyManager.ts` |
| `ScreenCapture` | Screenshot + image preprocessing | `../TFT-Hextech-Helper/src-backend/tft/recognition/ScreenCapture.ts` |
| `GameStateParser` | OCR text recognition | `../TFT-Hextech-Helper/src-backend/tft/recognition/OcrService.ts` |

## Files to Copy from Parent Project for Enhancement

To add more features, copy these from `../TFT-Hextech-Helper/src-backend/`:

| Feature | Files to Copy |
|---------|---------------|
| **Template Matching** | `tft/recognition/TemplateMatcher.ts`, `tft/recognition/TemplateLoader.ts` |
| **Champion Data** | `TFTProtocol.ts` (contains all champion names, costs, coordinates) |
| **Template Images** | `../TFT-Hextech-Helper/public/resources/assets/images/champion/` |
| **Item Recognition** | `../TFT-Hextech-Helper/public/resources/assets/images/equipment/` |

## Game Resolution

Currently configured for **1024x768** (same as parent project). All coordinate regions in `GameStateParser.ts` are based on this resolution.

## Region Definitions

The `REGIONS` object in `GameStateParser.ts` defines screen areas:
- `stage` - Top center, shows "1-1", "2-3", etc.
- `gold` - Bottom center, gold count
- `level` - Bottom left, level and XP
- `shopSlots[0-4]` - 5 shop unit slots
- `benchSlots[0-8]` - 9 bench unit slots

## Extending for Opponent Scouting

To parse opponent boards, you'll need to:
1. Add TAB key press to open scoreboard (or detect when it's open)
2. Define regions for opponent unit displays
3. Parse each opponent's visible units

## Dependencies

- `@nut-tree-fork/nut-js` - Screen capture
- `@techstark/opencv-js` - Image processing
- `sharp` - Image preprocessing for OCR
- `tesseract.js` - OCR text recognition
- `uiohook-napi` - Global hotkeys (kernel-level, works in fullscreen)

## Important Notes

- Requires **Administrator** privileges for uiohook-napi
- Game must be in **Borderless** or **Windowed** mode
- OCR works best with **Chinese** game client (for champion names)
- For English client, may need to adjust OCR language or use template matching
