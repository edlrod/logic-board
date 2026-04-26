# Logic Board

Logic Board is a small React + TypeScript sandbox for building and testing simple logic circuits on a 2D canvas, inspired by that of LittleBigPlanet 2.

You can place gates, wire them together, toggle switches, and export or import board state as a compact serialized string.

## Features

- Canvas-based board editor with pan and zoom
- Built-in chip types: `SWITCH`, `NODE`, `NOT`, `AND`, `OR`, `XOR`
- Live signal propagation through connected chips
- Rotation, dragging, wiring, deletion, and import/export support
- React frontend with Vite, TypeScript, and Biome

## Controls

- `Interact` mode: drag chips and click switches to toggle them
- `Design` mode: place chips on the grid
- `Wire` mode: click an output, then click an input to create a connection
- `R`: rotate the selected design preview or a dragged chip
- Mouse wheel in `Design`: change input count for chips that support variable inputs
- Mouse wheel outside that case: zoom
- Right mouse drag: pan the camera
- Right click in `Design`: remove a chip or clear its connections

## Development

This repo is set up for Bun and Vite.

```bash
bun install
bun run dev
```

Useful scripts:

- `bun run dev` starts the local dev server
- `bun run build` creates a production build
- `bun run preview` serves the built app locally
- `bun run check` runs Biome checks
- `bun run format` formats the repo with Biome

## Project Structure

```text
src/
  App.tsx         React app and canvas interaction layer
  App.css         Application UI styling
  main.tsx        React entrypoint
  index.css       Global styles
  lib/
    Board.ts      Board model
    Camera.ts     Camera transforms and zoom helpers
    Chip.ts       Chip definitions, simulation, serialization
    types.ts      Shared type definitions
```

## Import / Export Format

Export copies the current board to the clipboard as a base64-encoded JSON payload.

Import expects that same format and replaces the current board state.

## Notes

- This is a single-board editor. Nested or reusable custom boards are not part of the current app.
- Signal updates are propagated recursively through the graph. Very complex feedback loops are not a primary use case yet.
