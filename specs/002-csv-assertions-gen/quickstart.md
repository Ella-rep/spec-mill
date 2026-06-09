# Quickstart: CSV Assertion Generator

**Date**: 2026-06-09 | **Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

---

## Prerequisites

- Feature 001 fully implemented (`scripts/csv-to-spec.ts` present at project root)
- `npm install` already run
- `ExportXray_Admin.csv` present at project root

---

## Validate end-to-end

Run the enhanced converter:

```bash
npx ts-node scripts/csv-to-spec.ts ExportXray_Admin.csv out-assertions-test.spec.ts
```

Expected output: `✓ N cas de test convertis → out-assertions-test.spec.ts`

---

## Verify assertions are generated

Check that `runStep` bodies contain generated assertions, not empty TODOs:

```powershell
# Should print zero lines (no more "ajouter" TODOs)
Select-String -Path out-assertions-test.spec.ts -Pattern "TODO: ajouter"

# Should print multiple lines (new "vérifier/modifier" TODOs present)
Select-String -Path out-assertions-test.spec.ts -Pattern "TODO: vérifier/modifier"

# Should print multiple expect() calls
Select-String -Path out-assertions-test.spec.ts -Pattern "await expect"
```

Expected:
- `TODO: ajouter` → 0 matches
- `TODO: vérifier/modifier` → at least N matches (one per step)
- `await expect` → at least 60% of non-empty `Résultat Attendu` steps have one assertion

---

## Verify TypeScript validity

```bash
npx tsc --noEmit out-assertions-test.spec.ts
```

Expected: no errors (or only "cannot find module" errors for `../utils` which is expected).

---

## Spot-check assertion quality

Open `out-assertions-test.spec.ts` and find a step whose `attenduEtape` mentions a button. Confirm the generated assertion uses `getByRole('button', { name: '...' })`.

Find a step whose `attenduEtape` mentions `pop-in`. Confirm the generated assertion uses `getByRole('dialog')`.

Find a step with empty `Résultat Attendu`. Confirm the body contains only `// TODO: vérifier/modifier les assertions` with no `await expect(...)` call.

---

## Cleanup

```bash
# Remove test output
del out-assertions-test.spec.ts
```
