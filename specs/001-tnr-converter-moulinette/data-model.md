# Data Model: TNR Converter Moulinette

**Phase**: 1 — Design
**Date**: 2026-06-08
**Feature**: [spec.md](./spec.md)

---

## Entities

### TestCase

Represents one identified test case, grouping its ordered steps.

| Field | Type | Source | Notes |
|---|---|---|---|
| `identifier` | `string` | CSV col 2 — `Identificateur de cas de test` | Unique key for grouping rows |
| `summary` | `string` | CSV col 3 — `Résumé` | From the first row of the group |
| `profile` | `string \| null` | CSV col 8 — `Données` | e.g. `Admin`; drives login helper injection |
| `steps` | `TestStep[]` | All rows sharing this identifier | Ordered as they appear in the CSV |

---

### TestStep

Represents a single action + expected result within a test case.

| Field | Type | Source | Notes |
|---|---|---|---|
| `action` | `string` | CSV col 4 — `Action` | Human-readable action description |
| `expectedResult` | `string` | CSV col 6 — `Résultat Attendu` | Can be empty in the CSV |
| `stepId` | `string` | Derived from `action` | Kebab-case slug, used as the `runStep` identifier |

**Derivation rule for `stepId`**: lowercase, spaces and special characters replaced with `-`, e.g. `"Cliquer sur le bouton Créer"` → `"cliquer-sur-le-bouton-creer"`.

---

### CodegenLine

Represents one parsed line from a Playwright Codegen text input.

| Field | Type | Notes |
|---|---|---|
| `raw` | `string` | Original line as written by Codegen |
| `actionType` | `ActionType` | Detected action category (see enum below) |
| `selectorDescription` | `string` | Human-readable label extracted from the selector (e.g. `getByRole('button', { name: 'Valider' })` → `"bouton Valider"`) |
| `value` | `string \| null` | Fill value, option value, or key name if applicable |
| `inferredExpected` | `string` | Auto-generated `attenduEtape` in French |

---

### ActionType (enum)

```
GOTO          — page.goto(url)
CLICK         — .click()
FILL          — .fill(value)
CHECK         — .check()
UNCHECK       — .uncheck()
SELECT        — .selectOption(value)
PRESS         — .press(key)
HOVER         — .hover()
EXPECT_VISIBLE — expect(...).toBeVisible()
EXPECT_TEXT   — expect(...).toHaveText(...)
EXPECT_CLASS  — expect(...).toHaveClass(...)
UNKNOWN       — anything not matching the above
```

---

## State Transitions

Not applicable — the converter is a stateless batch processor. Input file → parse → generate → output file.

---

## Validation Rules

### CSV input
- File must be readable and non-empty
- First row must be the header row (detected by presence of `Identificateur` in col 2 header)
- Rows with an empty `Action` field (col 4) are silently skipped
- Rows with an empty `Identificateur` (col 2) inherit the identifier of the preceding row

### Codegen input
- File must be readable and non-empty
- Lines that are blank, import statements, or `test.describe` wrappers are skipped during parsing
- `UNKNOWN` action lines are preserved verbatim inside the step body with a `// TODO` expected result

---

## CSV Column Index Reference

| Index | Header | Used by converter |
|---|---|---|
| 0 | `Type de ticket` | No |
| 1 | `type de test` | No |
| 2 | `Identificateur de cas de test` | Yes — grouping key |
| 3 | `Résumé` | Yes — test name |
| 4 | `Action` | Yes — step description and body |
| 5 | `Priorité` | No |
| 6 | `Résultat Attendu` | Yes — `attenduEtape` |
| 7 | `Chemin de la bibliothèque de tests` | No |
| 8 | `Données` | Yes — user profile / login helper |
