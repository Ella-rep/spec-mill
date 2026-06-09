# Data Model: CSV Assertion Generator

**Branch**: `002-csv-assertions-gen` | **Date**: 2026-06-09

## Entities

This feature adds no persistent storage. All processing is in-memory during script execution.

### AssertionPattern (in-memory constant)

A compile-time rule mapping French text patterns to Playwright assertion templates.

| Field | Type | Description |
|-------|------|-------------|
| `name` | `string` | Human-readable rule name (e.g., `'popin'`, `'button-disabled'`) |
| `detect` | `(text: string) => boolean` | Returns true when the expected result text matches this pattern |
| `generate` | `(text: string) => string[]` | Returns one or more `await expect(...)` assertion strings |
| `priority` | `number` | Lower = evaluated first (1 = highest) |

Patterns are evaluated in priority order; first match wins.

---

### GeneratedAssertion (in-memory value)

The output unit of `generateAssertions()`. Not a class — just the return value shape.

| Field | Type | Description |
|-------|------|-------------|
| `lines` | `string[]` | One or more `await expect(...)` strings, plus the `// TODO` comment line |

---

### Existing entities (unchanged from Feature 001)

- **TestCase** — groups steps for one test identifier
- **TestStep** — one action + expected result + step ID

The `TestStep.expectedResult` field is the input to `generateAssertions()`.

---

## French Keyword → Assertion Type Map

| French keyword(s) | Assertion type | Playwright method |
|-------------------|----------------|-------------------|
| `pop-in`, `popin`, `fenêtre de confirmation` | Modal visible | `getByRole('dialog').toBeVisible()` |
| `bouton X` + `grisé` / `non cliquable` / `désactivé` | Button disabled | `getByRole('button', { name: 'X' }).toHaveClass(/.*disabled.*/)` |
| `bouton X` + `visible` / `apparaît` / `présent` / `affiché` | Button visible | `getByRole('button', { name: 'X' }).toBeVisible()` |
| `champ X` / `textbox X` | Text field visible | `getByRole('textbox', { name: 'X' }).toBeVisible()` |
| `"quoted text"` + visibility keyword | Text visible | `getByText('quoted text').toBeVisible()` |
| (any non-empty text, no match above) | Fallback text | `getByText('<text[:80]>').toBeVisible()` |
| (empty / whitespace only) | No assertion | `// TODO: vérifier/modifier les assertions` only |

---

## Element Name Extraction Rules

- **Button name**: match `bouton\s+"?([^",\n.]+)"?` (case-insensitive); capture group 1 is the name
- **Textbox name**: match `champ\s+"?([^",\n.]+)"?` or `textbox\s+"?([^",\n.]+)"?`
- **Quoted strings**: match all `"([^"]+)"` occurrences in the expected result; take first 3
- **Fallback text**: full expected result string, truncated to 80 chars, single-quotes escaped
