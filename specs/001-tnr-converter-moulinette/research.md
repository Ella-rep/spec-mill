# Research: TNR Converter Moulinette

**Phase**: 0 — Pre-design research
**Date**: 2026-06-08
**Feature**: [spec.md](./spec.md)

---

## Decision 1: Language and Runtime

**Decision**: TypeScript executed via `ts-node` (no compile step required)

**Rationale**: The project already has a TypeScript spec file at the root (`admin_recette_excel.spec.ts`). Using the same language for the converter scripts ensures consistency. `ts-node` lets scripts run directly without a build step, keeping things as simple as possible. Strong typing also serves as inline documentation, which aligns with the "well documented" requirement.

**Alternatives considered**:
- Plain JavaScript (Node.js): Simpler runtime setup, no `tsconfig.json` needed. Rejected because TypeScript types double as documentation and the project is already TypeScript-oriented.
- Python: No precedent in the project. Rejected.

---

## Decision 2: CSV Parsing Strategy

**Decision**: Native string splitting on `;` with manual quote handling — no external library

**Rationale**: The input format (`ExportXray_Admin.csv`) is a semicolon-delimited CSV where quoted fields use `""` escaping (standard Excel CSV). The file structure is stable and controlled (Xray export format). A small hand-rolled parser is sufficient and keeps the dependency count at zero.

**Alternatives considered**:
- `csv-parse` npm library: More robust for edge cases. Rejected because the extra dependency conflicts with "as simple as possible" and the format is well-known and stable.
- `papaparse`: Same reasoning as above.

---

## Decision 3: Codegen Parsing Strategy

**Decision**: Line-by-line regex matching to identify action type, target, and value

**Rationale**: Playwright Codegen output follows predictable patterns (`page.click(...)`, `page.fill(...)`, `page.goto(...)`, `expect(...).toBeVisible()`). A small set of regex patterns covers the vast majority of recorded actions. This approach is transparent, easy to extend, and requires no external parser.

**Alternatives considered**:
- Full TypeScript AST parsing: Much more accurate but requires `@typescript-eslint/parser` or similar. Rejected as overkill for a simple converter.
- String split + heuristics: Less precise than regex. Rejected.

---

## Decision 4: Auto-generation of Expected Results (Codegen Mode)

**Decision**: Map each detected action type to a French-language description template

**Rationale**: The user confirmed (option B) that expected results should be auto-generated from the action text. A lookup table of action-type → French description template covers common Playwright actions and produces readable output consistent with the existing spec file's `attenduEtape` style.

**Mapping table** (final design):
| Action pattern | Generated `attenduEtape` |
|---|---|
| `page.goto(url)` | `Navigation vers {url}` |
| `...click()` | `Clic sur {selector description}` |
| `...fill(value)` | `Saisie "{value}" dans {selector description}` |
| `...check()` | `Cocher {selector description}` |
| `...uncheck()` | `Décocher {selector description}` |
| `...selectOption(value)` | `Sélection de "{value}" dans {selector description}` |
| `...press(key)` | `Appui sur la touche {key}` |
| `...hover()` | `Survol de {selector description}` |
| `expect(...).toBeVisible()` | `{selector description} est visible` |
| `expect(...).toHaveText(text)` | `{selector description} contient le texte "{text}"` |
| Unrecognized line | `// TODO: décrire le résultat attendu` |

---

## Decision 5: Script Delivery Format

**Decision**: Two independent scripts (`scripts/csv-to-spec.ts` and `scripts/codegen-to-spec.ts`), each a standalone entry point

**Rationale**: The user explicitly said "script only, as simple as possible." Two separate scripts with clear names are easier to discover and use than a single script with subcommand flags. Each script reads one input file and writes one output file.

**Alternatives considered**:
- Single `moulinette.ts` with `--mode csv|codegen` flag: Slightly more unified. Rejected because two named scripts are more self-explanatory and require no flag documentation.
- npm scripts as wrappers: Acceptable but adds indirection. Both approaches are valid; npm scripts will be added as convenience aliases in `package.json`.

---

## Decision 6: Output File Naming

**Decision**: Default output filename derived from input filename (e.g., `ExportXray_Admin.csv` → `ExportXray_Admin.spec.ts`), overridable via second CLI argument

**Rationale**: Predictable default, no required argument beyond the input file. Developer can override when needed.

---

## Decision 7: Login Helper in Output Spec

**Decision**: The CSV-to-spec converter detects the `Données` column value (e.g., `Admin`) to determine whether to inject a login helper call, based on the existing template pattern

**Rationale**: The example spec shows a `loginAdmin` helper that handles authentication steps before each test. The CSV `Données` column carries the user profile. Rather than hardcoding, the converter checks this column and emits the appropriate helper call.

**Assumption**: Only `Admin` is supported in v1. Other profiles are emitted as `// TODO: login as {profile}`.
