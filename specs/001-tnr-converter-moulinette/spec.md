# Feature Specification: TNR Converter Moulinette

**Feature Branch**: `001-tnr-converter-moulinette`

**Created**: 2026-06-08

**Status**: Draft

**Input**: User description: "un PO créé un fichier de tests de non régression. depuis un scenario codegen de playwright exécuté par un PO, en suivant son fichier de tests, il copie colle le code généré et l'envoi au dev. Le dev crééer un fichier spec.ts pour vérifier les assertations des TNR envoyé du fichier du PO. Créé une moulinette avec deux fonctionnalités: 1 traduire le excel en fichier ts sur le modele fourni. 2 traduire un texte issu de codegen en fichier ts selon le format du fichier fourni."

## Clarifications

### Session 2026-06-09

- Q: Does the converter generate the `utils.ts` import statement in output specs? → A: Yes, automatically generates `import { runStep, captureStep } from '../utils'` at the top of each output spec (path configurable)
- Q: Where should `utils.ts` be placed in the target project? → A: Project root (`./utils.ts`); generated specs import it via `'../utils'` from a subfolder
- Q: How should the README handle hardcoded credentials in `utils.ts`? → A: README instructs adding `utils.ts` to `.gitignore` and reading credentials via `process.env`

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Convert Excel Test Plan to Spec File (Priority: P1)

A developer receives a structured test plan from a PO in Excel/CSV format (exported from Xray). The developer runs the converter tool with this file and obtains a ready-to-use spec file that follows the project's standard test structure template.

**Why this priority**: This is the primary workflow. POs maintain their test plans in Excel/Xray, and converting these files to spec files is the most frequent task for developers receiving TNR (non-regression test) campaigns.

**Independent Test**: Can be fully tested by providing the sample `ExportXray_Admin.csv` file as input and verifying that the output spec file matches the structure of `admin_recette_excel.spec.ts`, independently of the codegen conversion feature.

**Acceptance Scenarios**:

1. **Given** a CSV test plan file in the Xray export format, **When** the developer runs the converter with this file, **Then** a spec file is generated with one `test()` block per identified test case and one `test.step()` block per action row
2. **Given** a CSV file where multiple rows share the same test case identifier, **When** converted, **Then** all steps belonging to the same identifier are grouped within a single test block in the correct order
3. **Given** a CSV file where action and expected result fields are populated, **When** converted, **Then** each step includes the expected result text as an attached annotation in the output file
4. **Given** an invalid or empty CSV file, **When** converted, **Then** the tool reports a clear error message without generating a partial output file

---

### User Story 2 - Convert Playwright Codegen Output to Spec File (Priority: P2)

A PO records browser interactions using Playwright Codegen while following their test plan. They share the raw generated code with the developer. The developer runs the converter to transform this codegen output into a properly structured spec file ready for assertions.

**Why this priority**: This is the second conversion mode, complementing the Excel flow. It addresses the case where browser interactions have been recorded and need to be structured before assertion logic is added.

**Independent Test**: Can be tested by providing a sample Playwright Codegen snippet and verifying that the output file follows the template structure, independently of the Excel conversion feature.

**Acceptance Scenarios**:

1. **Given** a raw Playwright Codegen text input, **When** the developer runs the converter, **Then** a spec file is generated that wraps the browser actions into `test.step()` blocks following the template format
2. **Given** codegen output containing multiple sequential action groups, **When** converted, **Then** each action or logical group is mapped to a corresponding `test.step()` block in the output
3. **Given** codegen output that does not contain expected result descriptions, **When** converted, **Then** the tool auto-generates an expected result description for each step based on the recorded action text (e.g., a click on a button named "Valider" produces "Le bouton Valider est cliqué")
4. **Given** a malformed or empty codegen text, **When** converted, **Then** the tool reports a clear error message without generating an output file

---

### Edge Cases

- What happens when the CSV file uses a different column separator or encoding than the standard Xray export?
- What happens when a test case identifier in the CSV has no associated action rows?
- What happens when the codegen output contains browser navigation to external domains unrelated to the test scenario?
- What happens when input files contain duplicate test case identifiers?
- What happens when a file with the same output name already exists in the target location?
- What happens when the CSV contains rows with empty action fields?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The tool MUST accept a structured test plan file in the standard Xray CSV export format as input and produce a spec file following the provided template
- **FR-002**: The tool MUST group test steps by their test case identifier from the input CSV file
- **FR-003**: The tool MUST map each test step's action text and expected result to the corresponding fields in the output spec structure
- **FR-004**: The tool MUST accept raw Playwright Codegen text as input and produce a spec file following the provided template
- **FR-005**: The tool MUST preserve the original ordering of test cases and steps in the generated output file
- **FR-006**: The output spec file MUST include all mandatory structural elements from the template (test wrapper blocks, step wrapper blocks, expected result annotation fields)
- **FR-007**: The tool MUST report clear, actionable error messages when input files are malformed, missing, inaccessible, or do not match the expected format
- **FR-008**: The generated output files MUST be syntactically valid and require no structural corrections to be usable
- **FR-009**: The tool MUST generate `import { runStep, captureStep } from '../utils'` at the top of each output spec file (path relative to project root)

### Key Entities

- **Test Case**: An identified test scenario composed of one or more ordered steps, referenced by a unique identifier (`Identificateur de cas de test`) and a human-readable name (`Résumé`)
- **Test Step**: An individual action (`Action`) paired with its expected result (`Résultat Attendu`), belonging to a specific test case
- **Spec File**: The output artifact grouping test cases and steps into the project's standard test structure format, ready for assertion development
- **Test Plan File**: The PO-authored input document (CSV export from Xray) containing all test cases and steps organized by identifier
- **Codegen Snippet**: Raw browser-action recording output from Playwright Codegen, provided by the PO as text input to be structured into the spec format

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Developer can convert a test plan file containing 50 or more test steps in under 30 seconds
- **SC-002**: 100% of test cases and steps present in the input file appear in the generated output file with no omissions
- **SC-003**: Generated output files require less than 20% manual correction effort compared to writing the equivalent spec file by hand
- **SC-004**: A developer unfamiliar with the tool can complete their first successful conversion in under 5 minutes using only the tool's built-in guidance or documentation
- **SC-005**: The tool correctly maps all columns from the standard Xray CSV export format on 100% of compliant input files

## Assumptions

- The primary input format for the Excel conversion is CSV exported from Xray (Jira test management), using semicolons as column separators, as shown in `ExportXray_Admin.csv`
- The codegen text input is provided as a plain text file or directly pasted content, not a live browser session
- The output spec file follows the structural conventions of the `admin_recette_excel.spec.ts` file present in the project root, including serial test mode, step indexing, and expected result attachment
- The tool is used by individual developers on their local machine, not as a shared or web-based service
- A `utils.ts` file at the project root provides `runStep`, `captureStep`, `login`, and `postLogin` helpers; users must copy this file to their project and update it with their actual site URL and credentials before running generated specs
- `utils.ts` must be added to `.gitignore` and credentials should be read via `process.env` to avoid committing sensitive values
- The README must document the `utils.ts` setup step (copy file, configure URL + credentials + `.gitignore`) as a prerequisite before using the generated specs
- The tool produces a single output spec file per invocation; batch conversion of multiple test plans is out of scope for v1
