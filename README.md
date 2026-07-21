# Logic Board

Logic Board is a React + TypeScript logic-circuit sandbox with a modular architecture built around explicit boards, nodes, ports, and wires. It is inspired by that of LittleBigPlanet 2.

The current app lets you:

- place logic nodes on a canvas
- wire outputs to inputs
- add board-level inputs and outputs
- toggle switches and board inputs
- simulate the board as combinational logic
- use any board as a node inside another board
- export and import versioned workspace documents

## Architecture

The main layers are:

- `src/domain`
  Plain data structures and pure board commands
- `src/simulation`
  Graph building and combinational board evaluation
- `src/serialization`
  Versioned import/export document handling
- `src/editor`
  Viewport camera and geometry helpers
- `src/workspace`
  Multi-board container and module reconciliation
- `src/components`
  React UI, including `BoardViewport`, `Toolbar`, and shadcn primitives

Core domain terms:

- `Workspace`: a collection of boards with a root and active board
- `Board`: a simulated circuit container
- `Node`: a logic unit placed on a board
- `Port`: an input or output owned by a board or node
- `Wire`: a connection between ports
- `BoardViewport`: the canvas surface that displays and edits a board

## Features

- Canvas-based board editor with pan and zoom
- Built-in node kinds: `switch`, `not`, `and`, `or`, `xor`; any board can also be used as a `module:<boardId>` node in another board
- Auto-inserted router dots for shaping wires in `Design` mode
- Board-level inputs and outputs
- First-class wire model instead of direct node references
- Pure combinational simulation with validation and cycle detection
- Versioned workspace document export/import
- React frontend with Vite, TypeScript, and Biome

## Controls

- `Test` mode: click switches or board inputs to toggle them
- `Design` mode: click a node button to put a node in your hand, click an existing node to pick it up, and place it on the grid
- `Design` mode with an empty hand: click an output port, then an input port to connect them
- `Design` mode while wiring: click empty space to insert a router dot and continue the wire
- `1`: switch to `Test`
- `2`: switch to `Design`
- `R`: rotate the held node preview
- Hold `Ctrl` while placing a new node: place another copy and keep it in your hand
- Mouse wheel: zoom
- Right mouse drag: pan the camera
- Right click in `Design`: delete a node or board port

## Development

This repo is set up for Bun and Vite.

```bash
bun install
bun run dev
```

Useful scripts:

- `bun run dev` starts the local dev server
- `bun run build` creates a production build (`tsc -b && vite build`)
- `bun run lint` runs Biome checks and applies fixes (`biome check --write .`)
- `bun run preview` serves the built app locally

## Project Structure

```text
src/
  App.tsx
  main.tsx
  index.css
  components/
    BoardViewport.tsx
    Toolbar.tsx
    ui/
  domain/
    commands.ts
    definitions.ts
    factories.ts
    ids.ts
    index.ts
    ports.ts
    types.ts
    validateBoard.ts
  simulation/
    evaluateBoard.ts
    graph.ts
    index.ts
  serialization/
    boardDocument.ts
    workspaceDocument.ts
    migrateBoardDocument.ts
    index.ts
  editor/
    camera.ts
    geometry.ts
    types.ts
  workspace/
    types.ts
    reconcileModules.ts
  lib/
    utils.ts
```

## Import / Export Format

Export writes a URL-safe base64 encoded versioned workspace document to the clipboard.
You can also load an exported workspace on startup with a query param like
`?import=<encoded-workspace-data>`.

Current format:

```ts
{
  version: 1,
  rootBoardId?: BoardId,
  activeBoardId: BoardId,
  boards: Board[],
  publishedBoardIds?: BoardId[],
  externalInputsByBoardId?: Record<BoardId, Record<PortId, boolean>>
}
```

Import expects that format and replaces the current workspace state.
