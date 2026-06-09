# Tasks: CSV Assertion Generator

**Input**: Design documents from `specs/002-csv-assertions-gen/`

**Prerequisites**: plan.md ✅ | spec.md ✅ | research.md ✅ | data-model.md ✅ | quickstart.md ✅

**Tests**: Not requested — no test tasks generated.

**Organization**: Single user story. Tasks are sequential within `scripts/csv-to-spec.ts`.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story this task belongs to ([US1])
- No Setup or Foundational phases needed — project infrastructure already exists from Feature 001

---

## Phase 1: User Story 1 — Generate Playwright Assertions from Expected Results (Priority: P1) 🎯

**Goal**: Developer runs `npx ts-node scripts/csv-to-spec.ts ExportXray_Admin.csv out.spec.ts` and gets a spec file where each non-empty `Résultat Attendu` step body contains at least one `await expect(...)` assertion preceded by `// TODO: vérifier/modifier les assertions générées`, instead of the previous empty `// TODO: ajouter` placeholder.

**Independent Test**: Run `npx ts-node scripts/csv-to-spec.ts ExportXray_Admin.csv out-test.spec.ts` and verify: (1) zero occurrences of `"TODO: ajouter"`, (2) at least one `"await expect("` per step with a non-empty `Résultat Attendu`, (3) `npx tsc --noEmit out-test.spec.ts` reports no syntax errors.

### Implementation for User Story 1

- [x] T001 [US1] Add `generateAssertions(expectedResult: string): string[]` function to `scripts/csv-to-spec.ts` — implement all 6 priority patterns from `specs/002-csv-assertions-gen/research.md` D-002: (1) pop-in detection `/pop-in|popin|fenêtre de confirmation/i` → `getByRole('dialog').toBeVisible()`, (2) button disabled: extract name via `/bouton\s+"?([^",\n.]+)"?/i` + `/grisé|non cliquable|désactivé/i` → `getByRole('button', { name }).toHaveClass(/.*disabled.*/)`, (3) button visible: same name extraction + `/visible|apparaît|présent|affiché/i` → `getByRole('button', { name }).toBeVisible()`, (4) text field: `/champ\s+"?([^",\n.]+)"?/i` → `getByRole('textbox', { name }).toBeVisible()`, (5) quoted strings: extract up to 3 `"([^"]+)"` matches + visibility keyword → `getByText(q).toBeVisible()` per match, (6) fallback: `getByText(text.substring(0,80).replace(/'/g,"\\'")+').toBeVisible()`; empty/whitespace input returns `['// TODO: vérifier/modifier les assertions']`; all non-empty paths prepend `'// TODO: vérifier/modifier les assertions générées'` once before first `await expect(...)` line
- [x] T002 [US1] Update `generateSpec()` in `scripts/csv-to-spec.ts` — replace the single line `lines.push(\`      // TODO: ajouter les assertions Playwright pour cette étape\`)` with a loop that calls `generateAssertions(step.expectedResult)` and pushes each returned line with 6-space indentation: `for (const line of generateAssertions(step.expectedResult)) { lines.push(\`      \${line}\`); }`
- [x] T003 [US1] Smoke-test: run `npx ts-node scripts/csv-to-spec.ts ExportXray_Admin.csv out-assertions-test.spec.ts`; verify zero matches for `"TODO: ajouter"` in output; verify at least one `await expect(` line present; verify `npx tsc --noEmit --allowJs out-assertions-test.spec.ts` reports no syntax errors; delete test output file

**Checkpoint**: User Story 1 fully functional. Generated specs contain Playwright assertion candidates instead of empty TODOs.

---

## Phase 2: Polish & Cross-Cutting Concerns

**Purpose**: Update documentation to reflect the new assertion generation behavior.

- [x] T004 [P] Update `README.md` — in the `## Après la conversion` section, replace the bullet `**Script CSV** : les corps de \`runStep\` sont vides — à remplir avec les assertions Playwright.` with `**Script CSV** : chaque étape contient des assertions Playwright générées depuis le \`Résultat Attendu\`. Vérifier et ajuster les lignes marquées \`// TODO: vérifier/modifier les assertions générées\` avant d'exécuter.`; also update the `### Ce que produit le script` example block in the Script 1 section to show a `// TODO: vérifier/modifier` comment and a sample `await expect(...)` line instead of the old `// TODO: ajouter` placeholder

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (US1)**: T001 → T002 → T003 (sequential, all touch `scripts/csv-to-spec.ts`)
- **Phase 2 (Polish)**: Depends on Phase 1; T004 is parallel-safe (different file: `README.md`)

### Within User Story 1

- T001 (add function) must complete before T002 (update caller)
- T002 must complete before T003 (smoke test)

### Parallel Opportunities

- T004 can run in parallel with Phase 1 if README update is done independently; however, it logically follows Phase 1 validation

---

## Implementation Strategy

### MVP (All tasks — single story)

1. T001: Add `generateAssertions()` to `scripts/csv-to-spec.ts`
2. T002: Update `generateSpec()` to call it
3. T003: Smoke test — **STOP and VALIDATE** before proceeding
4. T004: Update README

### Quick Validation Loop

After T002, run the smoke test manually before completing T003:

```powershell
npx ts-node scripts/csv-to-spec.ts ExportXray_Admin.csv out-check.spec.ts
Select-String -Path out-check.spec.ts -Pattern "await expect"
del out-check.spec.ts
```

---

## Notes

- All code changes are in one file: `scripts/csv-to-spec.ts`
- No new imports, no new dependencies, no changes to `package.json` or `tsconfig.json`
- The `generateAssertions()` function is purely functional: `string → string[]`, easy to test manually
- Pattern matching is case-insensitive; French accents in keywords must be matched literally (e.g., `affiché`, `grisé`)
- TypeScript strict mode is `false` (per Feature 001 `tsconfig.json`) — no type annotation issues expected
