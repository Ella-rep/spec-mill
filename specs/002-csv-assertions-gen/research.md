# Research: CSV Assertion Generator

**Branch**: `002-csv-assertions-gen` | **Date**: 2026-06-09

## Decision Log

### D-001: Assertion pattern matching approach

**Decision**: Implement a rule-based regex/keyword matcher encoded directly in `csv-to-spec.ts` as a new `generateAssertions()` function. No external NLP library.

**Rationale**: The expected result text follows predictable French patterns (bouton X, pop-in, grisé, visible). A compact set of regex rules covers the majority of cases without adding runtime dependencies. Adding an NLP lib would violate the zero-external-dependencies constraint from Feature 001.

**Alternatives considered**:
- LLM call per step: Too slow, requires network, non-deterministic output
- Separate pattern config file: Adds complexity with no benefit at this scale
- External NLP (e.g., compromise.js): Adds a dependency for marginal accuracy gain

---

### D-002: Assertion type priority order

**Decision**: Apply patterns in this precedence order:
1. **Pop-in / modal** (keywords: `pop-in`, `popin`, `fenêtre de confirmation`) → `page.getByRole('dialog')`
2. **Disabled button** (element type `bouton` + keywords `grisé`, `non cliquable`, `désactivé`) → `toHaveClass(/.*disabled.*/)`
3. **Named button visible** (element type `bouton X`) → `page.getByRole('button', { name: 'X' }).toBeVisible()`
4. **Named text field** (element type `champ X`, `textbox`, `saisie`) → `page.getByRole('textbox', { name: 'X' }).toBeVisible()`
5. **Quoted text visible** (double-quoted strings `"X"` in expected result + visibility keyword) → `page.getByText('X').toBeVisible()`
6. **Fallback** (any non-empty text) → `page.getByText('<truncated text>').toBeVisible()`

**Rationale**: Priority order matches the confidence level of each pattern. Pop-in detection is highly reliable. Disabled-button detection requires both element type AND keyword to avoid false positives. Fallback guarantees at least one assertion for every non-empty expected result (SC-001 requirement).

---

### D-003: Locator strategy

**Decision**: Use `getByRole` for interactive elements (buttons, textboxes), `getByText` for text presence, `getByLabel` only when the expected result explicitly mentions a label name.

**Rationale**: Matches the style of `admin_recette_excel.spec.ts` which consistently uses `getByRole('button', { name: 'X' })` for buttons and `getByRole('textbox', { name: 'X' })` for inputs. `getByText` is the safest fallback for arbitrary text.

---

### D-004: Single `// TODO` comment placement

**Decision**: One `// TODO: vérifier/modifier les assertions générées` comment per step body, placed before the first generated assertion. For empty steps, the comment is the only content.

**Rationale**: One comment is enough to signal "needs review". Multiple `// TODO` per assertion would clutter the output and make bulk-review harder. Placing the comment once before the block makes it easy to search for (`grep "TODO: vérifier"`).

---

### D-005: Text truncation for fallback assertions

**Decision**: Truncate expected result text to 80 characters for fallback `getByText(...)` assertions. Escape single quotes with `\'`.

**Rationale**: Very long strings (multi-sentence expected results) produce unusable selectors. 80 chars preserves enough context for the developer to identify the assertion target. Single-quote escaping prevents syntax errors in the generated TypeScript.

---

### D-006: Multiple assertions per step

**Decision**: Allow multiple `await expect(...)` lines per step when the expected result contains multiple button names or multiple quoted strings (cap at 3 per step).

**Rationale**: The reference spec shows steps with multiple assertions (e.g., checking both "Annuler" and "Suivant" buttons visible). Capping at 3 prevents a single long expected result from generating an unwieldy block.

---

### D-007: Modification scope

**Decision**: Modify only `generateSpec()` in `scripts/csv-to-spec.ts`. Add `generateAssertions(expectedResult: string): string[]` as a new private function in the same file.

**Rationale**: No new files, no new interfaces, no changes to `scripts/shared.ts` or `scripts/codegen-to-spec.ts`. Minimal diff, easiest review.
