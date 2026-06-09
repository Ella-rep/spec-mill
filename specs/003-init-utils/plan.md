# Implementation Plan: Init Utils Command

**Branch**: `003-init-utils` | **Date**: 2026-06-09 | **Spec**: [spec.md](./spec.md)

## Summary

New CLI script `scripts/init-utils.ts` that copies the project's `utils.ts` to a user-specified destination directory. Adds `--auto` flag to target `process.cwd()`. Registered as `npm run init-utils`. README updated with usage.

## Technical Context

**Language/Version**: TypeScript 5.4 via ts-node 10.9

**Primary Dependencies**: Node.js built-ins only (`fs`, `path`) — zero new packages

**Storage**: File I/O — read `utils.ts` from project root, write to destination

**Testing**: Manual validation per quickstart.md

**Target Platform**: Node.js (developer machine, Windows/Linux/macOS)

**Project Type**: CLI tool — single script invocation

**Performance Goals**: Sub-second copy — file is ~3 KB

**Constraints**: Zero new npm dependencies (existing constraint from Features 001/002)

**Scale/Scope**: Single file, ~50 lines of TypeScript

## Constitution Check

No violations. This is a simple, single-file CLI tool with no external dependencies, no data storage, no authentication, and no external API calls.

## Project Structure

### Documentation (this feature)

```text
specs/003-init-utils/
├── spec.md
├── plan.md              ← this file
├── research.md
├── quickstart.md
└── checklists/
    └── requirements.md
```

### Source Code

```text
scripts/
├── csv-to-spec.ts       (existing)
├── codegen-to-spec.ts   (existing)
└── init-utils.ts        ← NEW

utils.ts                 (existing — this is what gets copied)
package.json             ← add "init-utils" script alias
README.md                ← add init-utils section
```

## Implementation Notes

### `scripts/init-utils.ts`

```
parse process.argv:
  - filter out node + script path (first two args)
  - detect "--auto" flag in remaining args
  - detect first non-flag arg as destArg

determine dest:
  - if destArg present → dest = path.resolve(destArg)
  - else if --auto flag → dest = process.cwd()
  - else → print usage message, process.exit(1)

sourcePath = path.join(__dirname, '..', 'utils.ts')
if (!fs.existsSync(sourcePath)) → print error, process.exit(1)

destFile = path.join(dest, 'utils.ts')
if (fs.existsSync(destFile)) → print overwrite warning

fs.mkdirSync(dest, { recursive: true })
fs.copyFileSync(sourcePath, destFile)
console.log("✓ utils.ts copied to " + destFile)
console.log("→ Edit utils.ts: update the site URL in login() and credentials in TEST_USERS")
```

### `package.json` change

Add to `scripts`:
```json
"init-utils": "ts-node scripts/init-utils.ts"
```

### `README.md` change

Add new section `## Initialiser utils.ts dans un projet cible` documenting:
- `npm run init-utils -- <destination>` (explicit path)
- `npm run init-utils -- --auto` (current directory)
- What to configure after copying (URL, credentials, .gitignore)
