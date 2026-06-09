# Implementation Plan: CSV Assertion Generator

**Branch**: `002-csv-assertions-gen` | **Date**: 2026-06-09 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/002-csv-assertions-gen/spec.md`

## Summary

Enhance `scripts/csv-to-spec.ts` (Feature 001) to auto-generate Playwright assertions inside `runStep` bodies by parsing the `Résultat Attendu` column. A new `generateAssertions()` function applies a priority-ordered set of French keyword patterns to produce `await expect(...)` calls. Every generated assertion is preceded by `// TODO: vérifier/modifier les assertions générées` so the developer reviews before running. Steps with an empty expected result emit only the TODO comment and no `expect()` call.

No new files, no new dependencies, no build step changes.

## Technical Context

**Language/Version**: TypeScript 5.x, Node.js ≥ 18

**Primary Dependencies**: none new — `ts-node` + `typescript` already present (Feature 001)

**Storage**: N/A — in-memory processing only

**Testing**: Manual smoke test against `ExportXray_Admin.csv`; TypeScript validity check via `npx tsc --noEmit`

**Target Platform**: Developer workstation (Windows/macOS/Linux)

**Project Type**: Enhancement to an existing CLI script

**Performance Goals**: No regression on Feature 001 baseline (<5 seconds for 100-row CSV)

**Constraints**: Zero new runtime dependencies; output must be syntactically valid TypeScript (SC-002)

**Scale/Scope**: Single function addition; ~80 lines of code change in `scripts/csv-to-spec.ts`

## Constitution Check

Constitution is template-only (no ratified principles). No governance gates apply.

*Post-design re-check*: One function added to one existing file. Minimal scope, zero violations.

## Project Structure

### Documentation (this feature)

```text
specs/002-csv-assertions-gen/
├── plan.md          ← this file
├── research.md      ← pattern decisions and rationale
├── data-model.md    ← entity map and keyword→assertion table
├── quickstart.md    ← validation guide
└── tasks.md         ← task list (created by /speckit-tasks)
```

### Source Code (repository root)

Only one file changes:

```text
scripts/
└── csv-to-spec.ts   ← add generateAssertions(); update generateSpec()
```

No new files. No changes to `scripts/shared.ts`, `scripts/codegen-to-spec.ts`, `package.json`, or `tsconfig.json`.

**Structure Decision**: Inline the pattern logic in `csv-to-spec.ts` as a private function. The change is localized to one file and does not affect the shared utilities or the codegen script.

## Implementation Notes

### New function: `generateAssertions(expectedResult: string): string[]`

Returns an array of TypeScript lines to place inside `runStep(...)`. Includes the `// TODO` comment and zero or more `await expect(...)` calls.

**Algorithm**:

1. If `expectedResult.trim() === ''` → return `['// TODO: vérifier/modifier les assertions']`
2. Apply patterns in priority order (first match wins):
   - **Priority 1 — Pop-in**: `/pop-in|popin|fenêtre de confirmation/i` → `['// TODO: vérifier/modifier les assertions générées', "await expect(page.getByRole('dialog')).toBeVisible();"]`
   - **Priority 2 — Button disabled**: extract button name via `/bouton\s+"?([^",\n.]+)"?/i` + detect `/grisé|non cliquable|désactivé/i` → `await expect(page.getByRole('button', { name: '${name}' })).toHaveClass(/.*disabled.*/);`
   - **Priority 3 — Button visible**: extract button name + detect `/visible|apparaît|présent|affiché/i` → `await expect(page.getByRole('button', { name: '${name}' })).toBeVisible();`
   - **Priority 4 — Text field**: extract field name via `/champ\s+"?([^",\n.]+)"?/i` → `await expect(page.getByRole('textbox', { name: '${name}' })).toBeVisible();`
   - **Priority 5 — Quoted strings**: extract all `"([^"]+)"` matches (max 3) + visibility keyword → one `await expect(page.getByText('${q}')).toBeVisible();` per match
   - **Priority 6 — Fallback**: `await expect(page.getByText('${expectedResult.substring(0,80).replace(/'/g, "\\'")}').toBeVisible();`
3. Prepend `// TODO: vérifier/modifier les assertions générées` before the first `await expect(...)` line (only once, even for multiple assertions)

### Modified: `generateSpec()` body

Replace:
```typescript
lines.push(`      // TODO: ajouter les assertions Playwright pour cette étape`);
```

With:
```typescript
const assertions = generateAssertions(step.expectedResult);
for (const line of assertions) {
  lines.push(`      ${line}`);
}
```

### Output format

**Before** (Feature 001):
```typescript
    await runStep(page, testInfo, 'mon-etape', stepIndex++, async () => {
      // TODO: ajouter les assertions Playwright pour cette étape
    });
```

**After** (this feature):
```typescript
    await runStep(page, testInfo, 'mon-etape', stepIndex++, async () => {
      // TODO: vérifier/modifier les assertions générées
      await expect(page.getByRole('button', { name: 'Valider' })).toBeVisible();
    });
```

**After** (empty expected result):
```typescript
    await runStep(page, testInfo, 'mon-etape', stepIndex++, async () => {
      // TODO: vérifier/modifier les assertions
    });
```

## Complexity Tracking

No constitution violations — no entries required.
