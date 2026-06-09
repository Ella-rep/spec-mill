# Tasks: TNR Converter Moulinette

**Input**: Design documents from `specs/001-tnr-converter-moulinette/`

**Prerequisites**: plan.md ✅ | spec.md ✅ | research.md ✅ | data-model.md ✅ | quickstart.md ✅

**Tests**: Not requested — no test tasks generated.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story this task belongs to ([US1] = CSV→spec, [US2] = Codegen→spec)
- All functions must include JSDoc comments (per "well documented" requirement)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Initialize the Node.js project so both scripts can be executed with `npx ts-node`.

- [x] T001 Create `package.json` at project root with `ts-node` and `typescript` in devDependencies, and `npm run csv-to-spec` / `npm run codegen-to-spec` convenience scripts pointing to `scripts/csv-to-spec.ts` and `scripts/codegen-to-spec.ts`
- [x] T002 [P] Create `tsconfig.json` at project root with minimal TypeScript config: `target: ES2020`, `module: CommonJS`, `strict: false`, `include: ["scripts/**/*"]`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared utility functions used by both scripts. Must exist before either script can be implemented.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [x] T003 Create `scripts/shared.ts` with two exported utility functions (each with JSDoc): `slugify(text: string): string` — converts French text to kebab-case step IDs (lowercase, accents stripped, spaces and special chars replaced with `-`); and `resolveOutputPath(inputPath: string, override?: string): string` — derives the default output path by replacing the input file extension with `.spec.ts`, or returns the override value if provided

**Checkpoint**: Foundation ready — user story implementation can now begin.

---

## Phase 3: User Story 1 — Convert CSV Test Plan to Spec File (Priority: P1) 🎯 MVP

**Goal**: Developer runs `npx ts-node scripts/csv-to-spec.ts ExportXray_Admin.csv` and gets a valid Playwright spec file matching the structure of `admin_recette_excel.spec.ts`.

**Independent Test**: Run the script against `ExportXray_Admin.csv` (present at project root) and verify: (1) correct number of `test()` blocks matches distinct identifiers in the CSV, (2) each test block contains `test.step()` + `runStep()` wrappers, (3) `attenduEtape` values from the `Résultat Attendu` column appear in the output.

### Implementation for User Story 1

- [x] T004 [P] [US1] Define `TestCase` and `TestStep` TypeScript interfaces with JSDoc at the top of `scripts/csv-to-spec.ts` (fields: see `data-model.md` — `identifier`, `summary`, `profile`, `steps` for TestCase; `action`, `expectedResult`, `stepId` for TestStep)
- [x] T005 [US1] Implement `parseCSVLine(line: string): string[]` in `scripts/csv-to-spec.ts` with JSDoc — splits on `;`, unescapes `""` to `"`, trims whitespace from each field
- [x] T006 [US1] Implement `loadCSV(filePath: string): TestCase[]` in `scripts/csv-to-spec.ts` with JSDoc — reads the file, skips the header row, groups rows by column 2 (`Identificateur`), inherits the identifier from the preceding row when column 2 is empty, skips rows with an empty `Action` (column 4), derives `stepId` via `slugify(action)`
- [x] T007 [US1] Implement `generateSpec(cases: TestCase[]): string` in `scripts/csv-to-spec.ts` with JSDoc — renders the full spec file string: first line MUST be `import { runStep, login, postLogin, TEST_USERS } from '../utils';` (FR-009), then `import { test, expect } from '@playwright/test';`, then `test.describe.configure({ mode: 'serial' })`, one `test()` block per TestCase, `loginAdmin` call injected when `profile === 'Admin'`, one `test.step()` + `testInfo.attach('attendu-etape', ...)` + `runStep(page, testInfo, stepId, stepIndex++, ...)` block per TestStep (action text is used as the step body comment; `expectedResult` populates `attenduEtape`)
- [x] T008 [US1] Implement the CLI entry point at the bottom of `scripts/csv-to-spec.ts`: validate that at least one argument was provided; print `Erreur : fichier introuvable : <path>` if input does not exist; print `Erreur : le fichier est vide : <path>` if input is empty; warn to console if output file already exists; write the generated spec to the resolved output path and print the output path on success
- [x] T009 [US1] Smoke-test by running `npx ts-node scripts/csv-to-spec.ts ExportXray_Admin.csv out-csv.spec.ts` — verify the output file exists, count its `test(` occurrences (should match the number of distinct non-empty identifiers in the CSV), and confirm at least one `loginAdmin` call is present

**Checkpoint**: User Story 1 is fully functional and independently testable.

---

## Phase 4: User Story 2 — Convert Playwright Codegen Output to Spec File (Priority: P2)

**Goal**: Developer saves a Playwright Codegen recording to a `.txt` file, runs `npx ts-node scripts/codegen-to-spec.ts recording.txt`, and gets a valid spec file where each detected action is wrapped in a `test.step()` block with an auto-generated French `attenduEtape`.

**Independent Test**: Create a minimal `codegen-sample.txt` containing at least one `page.goto(...)`, one `.click()`, and one `.fill(...)` line. Run the script and verify: (1) the output contains one `test.step()` block per action line, (2) `attenduEtape` strings are in French and match the expected generation rules from `research.md`, (3) unrecognised lines carry a `// TODO: décrire le résultat attendu` placeholder.

### Implementation for User Story 2

- [x] T010 [P] [US2] Define `ActionType` enum and `CodegenLine` TypeScript interface with JSDoc at the top of `scripts/codegen-to-spec.ts` (ActionType values: `GOTO`, `CLICK`, `FILL`, `CHECK`, `UNCHECK`, `SELECT`, `PRESS`, `HOVER`, `EXPECT_VISIBLE`, `EXPECT_TEXT`, `EXPECT_CLASS`, `UNKNOWN`; CodegenLine fields: `raw`, `actionType`, `selectorDescription`, `value`, `inferredExpected`)
- [x] T011 [US2] Implement the `PATTERNS` constant in `scripts/codegen-to-spec.ts` with JSDoc — an array of `{ type: ActionType, regex: RegExp }` entries covering all ActionType values (e.g. `/\.click\(\)/` → `CLICK`; `/page\.goto\(['"](.+)['"]\)/` → `GOTO`; `/\.fill\(['"](.+)['"]\)/` → `FILL`; etc.)
- [x] T012 [US2] Implement `extractSelectorLabel(locatorExpr: string): string` in `scripts/codegen-to-spec.ts` with JSDoc — extracts a human-readable label from a Playwright locator expression: for `getByRole('button', { name: 'X' })` returns `"bouton X"`, for `getByRole('textbox', { name: 'X' })` returns `"champ X"`, for `getByText('X')` returns `"X"`, for `getByLabel('X')` returns `"X"`, for unrecognised patterns returns the raw expression truncated to 40 chars
- [x] T013 [US2] Implement `inferExpected(line: CodegenLine): string` in `scripts/codegen-to-spec.ts` with JSDoc — applies the French description mapping table from `research.md`: `GOTO` → `"Navigation vers {url}"`, `CLICK` → `"Clic sur {selectorDescription}"`, `FILL` → `"Saisie \"{value}\" dans {selectorDescription}"`, `CHECK` → `"Cocher {selectorDescription}"`, `UNCHECK` → `"Décocher {selectorDescription}"`, `SELECT` → `"Sélection de \"{value}\" dans {selectorDescription}"`, `PRESS` → `"Appui sur la touche {value}"`, `HOVER` → `"Survol de {selectorDescription}"`, `EXPECT_VISIBLE` → `"{selectorDescription} est visible"`, `EXPECT_TEXT` → `"{selectorDescription} contient le texte \"{value}\""`, `EXPECT_CLASS` → `"{selectorDescription} a la classe \"{value}\""`, `UNKNOWN` → `"// TODO: décrire le résultat attendu"`
- [x] T014 [US2] Implement `parseCodegen(text: string): { testName: string; lines: CodegenLine[] }` in `scripts/codegen-to-spec.ts` with JSDoc — splits input on newlines; skips blank lines, import statements, `test.describe` wrapper lines, and closing brace-only lines; extracts the test name from the first `test('...', ` match (defaults to `'Test généré'`); for each remaining line, detects `ActionType` via `PATTERNS`, extracts `selectorDescription` via `extractSelectorLabel`, extracts `value` via regex capture group, computes `inferredExpected` via `inferExpected`
- [x] T015 [US2] Implement `generateSpec(testName: string, lines: CodegenLine[]): string` in `scripts/codegen-to-spec.ts` with JSDoc — renders the full spec file string: first line MUST be `import { runStep, login, postLogin, TEST_USERS } from '../utils';` (FR-009), then `import { test, expect } from '@playwright/test';`, then `test.describe.configure({ mode: 'serial' })`, one `test()` block with sequential `test.step()` + `testInfo.attach('attendu-etape', ...)` + `runStep(page, testInfo, slugify(inferredExpected), stepIndex++, ...)` per CodegenLine; `UNKNOWN` lines place the raw source in the step body as a comment
- [x] T016 [US2] Implement the CLI entry point at the bottom of `scripts/codegen-to-spec.ts`: validate that at least one argument is provided; print `Erreur : fichier introuvable : <path>` if input does not exist; print `Erreur : le fichier est vide : <path>` if input is empty; warn if output file already exists; write spec and print output path on success
- [x] T017 [US2] Smoke-test: create `codegen-sample.txt` containing at least `page.goto(...)`, a `.click()`, a `.fill(...)`, and one unrecognised line; run `npx ts-node scripts/codegen-to-spec.ts codegen-sample.txt out-codegen.spec.ts`; verify output structure and presence of French `attenduEtape` strings and `// TODO` placeholder

**Checkpoint**: Both user stories are independently functional.

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Final quality pass — documentation completeness, convenience aliases, end-to-end validation.

- [x] T018 [P] Review all JSDoc comments across `scripts/shared.ts`, `scripts/csv-to-spec.ts`, and `scripts/codegen-to-spec.ts` — ensure every exported function has: one-line summary, `@param` for each parameter, `@returns` description, and one `@example` showing a sample call and result
- [x] T019 Run the full quickstart.md smoke test sequence end-to-end: `npm install && npx ts-node scripts/csv-to-spec.ts ExportXray_Admin.csv out-csv.spec.ts && npx ts-node scripts/codegen-to-spec.ts codegen-sample.txt out-codegen.spec.ts` — confirm both output files are created and syntactically valid
- [x] T020 [P] Document `utils.ts` setup in `README.md` and `specs/001-tnr-converter-moulinette/quickstart.md` — add prerequisites section covering: copy `utils.ts` to project root, update site URL in `login()`, update `TEST_USERS` credentials, add `utils.ts` to `.gitignore`, recommend `process.env` for credentials (FR-009 / clarification 2026-06-09)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately; T001 and T002 are parallel
- **Foundational (Phase 2)**: Depends on Phase 1 completion — T003 blocks all user story tasks
- **User Story 1 (Phase 3)**: Depends on T003; tasks T004–T008 run sequentially (each builds on the previous); T009 validates the complete story
- **User Story 2 (Phase 4)**: Depends on T003; T010 and T011 can start in parallel; T012–T016 build sequentially; T017 validates the complete story
- **Polish (Phase 5)**: Depends on Phase 3 and Phase 4 completion

### User Story Dependencies

- **User Story 1 (P1)**: Can start as soon as T003 is done — no dependency on US2
- **User Story 2 (P2)**: Can start as soon as T003 is done — no dependency on US1 (both scripts are independent)

### Within User Story 1

- T004 (types) → T005 (CSV line parser) → T006 (CSV loader) → T007 (spec generator) → T008 (CLI entry) → T009 (smoke test)

### Within User Story 2

- T010 (types) and T011 (patterns) in parallel → T012 (selector label) → T013 (infer expected) → T014 (parse codegen) → T015 (generate spec) → T016 (CLI entry) → T017 (smoke test)

### Parallel Opportunities

- T001 and T002 (Phase 1) can run in parallel
- After T003, US1 and US2 phases can run in parallel (different files)
- T004 and T010 can start simultaneously (different files)
- T018 (JSDoc review) can run in parallel across both script files

---

## Parallel Example: User Story 2

```
# After T003 completes, launch US2 foundation in parallel:
Task T010: Define ActionType enum + CodegenLine interface in scripts/codegen-to-spec.ts
Task T011: Implement PATTERNS regex catalogue in scripts/codegen-to-spec.ts
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001–T002)
2. Complete Phase 2: Foundational (T003)
3. Complete Phase 3: User Story 1 (T004–T008)
4. **STOP and VALIDATE**: Run T009 smoke test against `ExportXray_Admin.csv`
5. If output matches expected structure → MVP is delivered

### Incremental Delivery

1. Setup + Foundational → Node.js project ready, shared utils available
2. User Story 1 (CSV→spec) → test with `ExportXray_Admin.csv` → **MVP**
3. User Story 2 (Codegen→spec) → test with `codegen-sample.txt` → **Full feature**
4. Polish → documentation complete, smoke tests pass → **Ready to hand off**

---

## Notes

- [P] tasks operate on different files and have no in-flight dependencies
- Each smoke test task (T009, T017) validates the full story independently before moving on
- `scripts/shared.ts` functions are imported by both scripts — changes there affect both
- No build step required; run scripts directly with `npx ts-node`
- The output template is fixed to match `admin_recette_excel.spec.ts` at the project root — if that file changes, revisit T007 and T015
