# Implementation Plan: TNR Converter Moulinette

**Branch**: `001-tnr-converter-moulinette` | **Date**: 2026-06-08 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/001-tnr-converter-moulinette/spec.md`

## Summary

Two standalone TypeScript scripts that convert PO-authored test artifacts into Playwright spec files matching the `admin_recette_excel.spec.ts` template. Script 1 reads an Xray-exported CSV and groups rows into `test()` + `test.step()` blocks. Script 2 reads raw Playwright Codegen output and wraps each detected browser action into `test.step()` blocks with auto-generated French expected-result descriptions.

No web interface, no build step required — scripts run directly via `npx ts-node`.

## Technical Context

**Language/Version**: TypeScript 5.x, Node.js ≥ 18

**Primary Dependencies**: `ts-node` (runtime), `typescript` (compiler toolchain) — no parsing libraries

**Storage**: N/A — reads input files, writes output files; no database or persistent state

**Testing**: Manual smoke tests using the sample files at the project root (`ExportXray_Admin.csv`, `admin_recette_excel.spec.ts`)

**Target Platform**: Developer workstation (Windows/macOS/Linux)

**Project Type**: CLI scripts (two entry-point TypeScript files)

**Performance Goals**: Convert a 100-row CSV in under 5 seconds (well within the 30-second SC-001 target)

**Constraints**: Zero runtime dependencies beyond `ts-node` + `typescript`; no build output required

**Scale/Scope**: Single-developer local tool; input files up to a few hundred rows

## Constitution Check

The project constitution file contains only template placeholders (no ratified principles). No governance gates apply. This plan is free to proceed.

*Post-design re-check*: Architecture (two standalone scripts, no external state, no UI) is the simplest possible solution for the stated requirements. No violations to justify.

## Project Structure

### Documentation (this feature)

```text
specs/001-tnr-converter-moulinette/
├── plan.md          ← this file
├── research.md      ← Phase 0: decisions and rationale
├── data-model.md    ← Phase 1: entities and CSV column mapping
├── quickstart.md    ← Phase 1: how to run and validate
└── tasks.md         ← Phase 2 output (created by /speckit-tasks)
```

### Source Code (repository root)

```text
scripts/
├── csv-to-spec.ts       ← Script 1: Xray CSV → Playwright spec file
└── codegen-to-spec.ts   ← Script 2: Codegen text → Playwright spec file

package.json             ← Node.js project config (ts-node, typescript)
tsconfig.json            ← TypeScript config (minimal, scripts only)
```

**Structure Decision**: Flat `scripts/` directory with two named entry points. No `src/`, no `lib/`, no `dist/`. Each script is self-contained (shared helper functions are inlined or extracted into a small `scripts/shared.ts` if they exceed ~30 lines of duplication).

## Implementation Notes

### Script 1 — `csv-to-spec.ts`

1. Read the input CSV file as UTF-8 text
2. Split on newlines; parse each line by splitting on `;` with basic quote-unescape (`""` → `"`)
3. Skip the header row (detected by `Identificateur` in column 2)
4. Group data rows by column 2 (`Identificateur de cas de test`); rows with empty col 2 inherit the previous identifier
5. Skip rows with an empty `Action` (col 4)
6. For each group, emit:
   - `test('summary', async ({ page }, testInfo) => { ... })`
   - `let stepIndex = 1;`
   - If `Données` (col 8) === `'Admin'`: emit `stepIndex = await loginAdmin(page, testInfo, stepIndex);`
   - For each step: emit `test.step(action, async () => { ... })` wrapping `runStep(...)` with `attenduEtape` attach
7. Wrap all tests in the standard imports + `test.describe.configure({ mode: 'serial' })`
8. Write output to the resolved output path; warn and overwrite if file exists

### Script 2 — `codegen-to-spec.ts`

1. Read the input text file as UTF-8
2. Skip import lines and structural boilerplate (`test.describe`, closing braces)
3. Extract the test name from `test('name', ...` if present; default to `'Test généré'`
4. For each remaining action line:
   - Match against the regex catalogue (see `data-model.md` → ActionType enum)
   - Extract `selectorDescription` from the locator expression
   - Compute `inferredExpected` from the action-type mapping table (see `research.md`)
   - Emit a `test.step()` + `runStep()` block
5. `UNKNOWN` lines are emitted verbatim inside the step body with a `// TODO` placeholder
6. Wrap output in standard imports + `test.describe.configure({ mode: 'serial' })`
7. Write output to the resolved output path

### Shared helpers (`scripts/shared.ts` — only if needed)

- `slugify(text: string): string` — converts a French string to a kebab-case step ID
- `resolveOutputPath(inputPath: string, overridePath?: string): string` — derives default output path
- `parseCSVLine(line: string): string[]` — splits a semicolon-delimited line, unescaping `""`
- `extractSelectorLabel(locatorExpr: string): string` — extracts a human-readable name from a Playwright locator expression

### `utils.ts` dependency (FR-009)

Both scripts automatically generate `import { runStep, captureStep } from '../utils'` at the top of each output spec. This assumes `utils.ts` is at the project root (one level above the generated spec's folder). Users must copy `utils.ts` to their target project and configure it (site URL, credentials) before running generated specs. `utils.ts` must be added to `.gitignore`; credentials should be read via `process.env`.

### Output file template

Both scripts produce files matching this pattern:

```typescript
import { runStep, login, postLogin, TEST_USERS } from '../utils';
import { test, expect } from '@playwright/test';

test.describe.configure({ mode: 'serial' });

test('<test name>', async ({ page }, testInfo) => {
  let stepIndex = 1;

  await test.step('<step description>', async () => {
    const attenduEtape = '<expected result>';
    await testInfo.attach('attendu-etape', { body: attenduEtape, contentType: 'text/plain' });
    await runStep(page, testInfo, '<step-id>', stepIndex++, async () => {
      <action code>
    });
  });
});
```

## Complexity Tracking

No constitution violations — no entries required.
