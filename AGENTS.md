# AGENTS.md

React 19 + TypeScript + Vite logic-circuit sandbox. Package manager and script runner is **Bun** (`bun.lock`). Not a Bun-runtime app.

## Commands

Only these `package.json` scripts exist: `dev`, `build`, `lint`, `preview` (`check`/`format` are common guesses — they don't exist; use `lint`).

- `bun install`
- `bun run dev` — Vite dev server
- `bun run build` — `tsc -b && vite build` (this is the only typecheck path)
- `bun run lint` — `biome check --write .` — **mutates files** (applies lint fixes, formatting, and import organization). For a read-only preview run `bunx biome check .`
- `bun run preview` — serve the built app

No `typecheck` script. To typecheck without building: `bunx tsc -b`.

**No tests, no test runner, no CI.** Don't invent test commands. Verification loop: `bun run lint` then `bun run build`.

## Toolchain quirks

- TS uses project references (`tsc -b`). `verbatimModuleSyntax: true` → type-only imports must use `import type` (enforced). `allowImportingTsExtensions: true` → imports include `.ts`/`.tsx` extensions (e.g. `./App.tsx`). `erasableSyntaxOnly: true` → no enums/namespaces; use union types + plain objects. `noUnusedLocals`/`noUnusedParameters` are on.
- Path alias `@/*` → `src/*` (configured in both `tsconfig.json` and `vite.config.ts`).
- Biome is the only formatter/linter: **tabs**, **double quotes**, organize-imports on. Don't reconfigure or mix with Prettier/ESLint.
- Vite `base: "/logic-board/"` — app is served from a subpath (GitHub Pages), not root. Affects asset URLs and the `?import=` deep link.

## Architecture

Multi-board app: a `Workspace` (`src/workspace/types.ts`) holds many `Board`s with a root and active board, and export/import uses a **workspace document** (`SerializedWorkspaceDocumentV1`). The board-document code in `src/serialization/boardDocument.ts` (incl. a compact V2 tuple format) still exists but is **not** used by the UI's import/export.

- **All board mutations flow through `BoardCommand` → `applyBoardCommand`** (`src/domain/commands.ts`). Never mutate `Board`/`Workspace`/`Node`/`Wire` objects directly.
- `src/domain` — pure data types, factories, the builtin `NodeDefinition` registry (`definitions.ts`), and `validateBoard`. The builtin kind enum includes `buffer`/`boardInput`/`boardOutput`, but the UI palette is a subset defined in `App.tsx` (`PALETTE_NODE_KINDS`).
- `src/simulation` — combinational evaluation + graph/cycle detection only. No sequential/clocked logic.
- `src/serialization` — workspace + board document (de)serialization and migration. Always route imported data through `migrateWorkspaceDocument` / `migrateBoardDocument`.
- `src/editor` — camera/geometry helpers and the `Tool` type (`"TEST"` | `"DESIGN"`).
- `src/workspace` — `Workspace` type + `reconcileBoardModuleNodes`, which auto-syncs a module node's ports when its target board's input/output count changes.
- `src/components` — `BoardViewport`, `Toolbar`, and `components/ui/*` (shadcn primitives).
- `src/App.tsx` is the **single orchestrator**: owns `Workspace` state, builds dynamic module definitions, runs reconciliation after each command, and handles import/export + the `?import=` URL param. `src/main.tsx` wraps it in `ThemeProvider` (next-themes, dark mode supported).

### Module nodes

Any board can be used as a node in another board via kind `module:<boardId>` (see `getModuleNodeKind`). Dynamic `NodeDefinition`s are built in `App.tsx` (`buildModuleDefinitions`), which **excludes the root and active board** from the palette.

### Serialization gotchas

- Workspace export = base64**url** (`-`/`_`, no padding) of JSON. Legacy board-document export = standard base64. Don't mix the two.
- Import/export use `navigator.clipboard` and require a **secure context** (https or localhost). If the clipboard is unavailable, export falls back to an on-screen dialog.

## UI

- shadcn (`components.json`): style `base-nova`, aliases `@/components`, `@/components/ui`, `@/lib`, `@/hooks`, icons via `lucide-react`. Add components with `bunx shadcn add <name>`. `cn` lives in `src/lib/utils.ts`.
- Tailwind v4 via `@tailwindcss/vite` — there is no `tailwind.config.js`; theme tokens live in `src/index.css`.

## Commits

History uses Conventional Commits (`feat:`, `chore:`, `refactor:`).
