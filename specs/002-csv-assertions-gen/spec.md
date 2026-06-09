# Feature Specification: CSV Assertion Generator

**Feature Branch**: `002-csv-assertions-gen`

**Created**: 2026-06-09

**Status**: Draft

**Input**: User description: "ajoute une fonctionnalité: depuis le csv vers Playwright, utilise les attendu d'étapes et le code exemple fourni spec.ts pour générer les assertions pour chaque étape. les TODO ajouter deviennent des TODO vérifier/modifier"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Generate Playwright Assertions from Expected Results (Priority: P1)

A developer converts a CSV test plan and receives a spec file where each test step body already contains Playwright assertion code inferred from the `Résultat Attendu` column, rather than an empty placeholder. Every generated assertion is tagged with a `// TODO: vérifier/modifier` comment so the developer reviews and adjusts before running.

**Why this priority**: The primary pain point of the current converter is that all step bodies are empty, requiring the developer to write every assertion by hand. Auto-generating candidate assertions from the expected result text eliminates the most repetitive part of the conversion workflow.

**Independent Test**: Convert `ExportXray_Admin.csv` with the enhanced script and verify that: (1) each `runStep` body contains at least one `await expect(...)` line where the `Résultat Attendu` column is non-empty, (2) every generated line is accompanied by a `// TODO: vérifier/modifier` comment, (3) steps whose expected result is empty or cannot be parsed still include a `// TODO: vérifier/modifier` placeholder.

**Acceptance Scenarios**:

1. **Given** a CSV row with `Résultat Attendu` text containing an element name or visibility keyword, **When** the developer runs the converter, **Then** the step body contains a `await expect(page.getByText(...)).toBeVisible()` or equivalent assertion with a `// TODO: vérifier/modifier` comment
2. **Given** a CSV row whose `Résultat Attendu` mentions a button, input, or named UI element, **When** converted, **Then** the assertion targets that element using the most appropriate `getByRole` or `getByText` locator with `toBeVisible()` as the default assertion
3. **Given** a CSV row with an empty `Résultat Attendu`, **When** converted, **Then** the step body contains only `// TODO: vérifier/modifier les assertions` and no generated `expect()` call
4. **Given** a CSV row whose `Résultat Attendu` cannot be mapped to a specific element, **When** converted, **Then** the step body contains a best-effort assertion based on any text extracted from the expected result, marked `// TODO: vérifier/modifier`
5. **Given** the reference spec file `admin_recette_excel.spec.ts` is present at the project root, **When** the script is run, **Then** the assertion patterns match the style used in that reference file (`toBeVisible`, `toHaveText`, `toHaveClass`)

---

### Edge Cases

- What happens when `Résultat Attendu` contains only whitespace or punctuation?
- What happens when the text is too long or ambiguous to map to a single element?
- What happens when `Résultat Attendu` references multiple elements in one sentence?
- What happens when the reference spec file is missing from the project root?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The enhanced script MUST generate at least one `await expect(...)` assertion in the `runStep` body for each step where `Résultat Attendu` is non-empty
- **FR-002**: Every generated assertion line MUST be preceded by a `// TODO: vérifier/modifier` comment so the developer can review it before running
- **FR-003**: Steps with an empty or whitespace-only `Résultat Attendu` MUST produce `// TODO: vérifier/modifier les assertions` with no generated `expect()` call
- **FR-004**: The assertion generator MUST use `toBeVisible()` as the default assertion for element-presence patterns (visible, affiché, apparaît, présent)
- **FR-005**: The assertion generator MUST use `toHaveText(...)` when the expected result specifies a literal text value to verify
- **FR-006**: The assertion generator MUST extract element names (buttons, inputs, labels, links) from the expected result text and use them in `getByRole` or `getByText` locators
- **FR-007**: The assertion generator MUST use the reference spec file `admin_recette_excel.spec.ts` style: `getByRole('button', { name: '...' })`, `getByText(...)`, `getByLabel(...)` locator patterns
- **FR-008**: All other tool behaviour from the original feature (grouping, ordering, `loginAdmin` injection, `attenduEtape` attachment, error handling) MUST remain unchanged

### Key Entities

- **Expected Result Text**: The `Résultat Attendu` column value for a test step — parsed to extract element names, assertion types, and visibility conditions
- **Assertion Pattern**: A mapping from a French keyword or sentence fragment to a Playwright `expect(...)` call template
- **Generated Assertion**: A `await expect(...)` line produced by the pattern matcher, always accompanied by a `// TODO: vérifier/modifier` comment

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: At least 60% of steps in `ExportXray_Admin.csv` that have a non-empty `Résultat Attendu` receive at least one generated `await expect(...)` assertion (not just a TODO comment)
- **SC-002**: Zero steps produce a syntactically invalid TypeScript output (the generated file must pass `npx tsc --noEmit`)
- **SC-003**: A developer can validate and adjust all generated assertions in a 50-step spec in under 10 minutes, compared to writing them from scratch
- **SC-004**: The enhanced script produces output in the same time budget as the original (under 30 seconds for 100 rows)

## Assumptions

- The reference spec file `admin_recette_excel.spec.ts` is present at the project root and is used as a style guide only — the generator does not parse it dynamically; the assertion patterns are encoded directly in the script
- The `Résultat Attendu` text is written in French; the pattern matcher targets French keywords (visible, affiché, cliquable, présent, apparaît, contient)
- Generated locators use text extracted from the expected result as approximate selectors — the developer is expected to refine them via the `// TODO: vérifier/modifier` annotations
- The enhancement applies only to `scripts/csv-to-spec.ts`; `scripts/codegen-to-spec.ts` is not modified by this feature
- When no pattern matches, the script falls back to a `getByText(extractedText).toBeVisible()` assertion using the full expected result text, truncated to 80 characters
