# Quickstart: TNR Converter Moulinette

**Date**: 2026-06-08
**Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

---

## Prerequisites

- Node.js ≥ 18 installed
- Run `npm install` at the project root once to install `ts-node` and `typescript`

### Configure `utils.ts` (required before running generated specs)

The generated spec files import helpers from `utils.ts` at the project root via `import { runStep, captureStep } from '../utils'`. Before executing any generated spec:

1. Copy `utils.ts` to the root of your target Playwright project
2. Update the site URL in `login()` (`page.goto('https://...')`)
3. Update credentials in `TEST_USERS` for each role (`admin`, `manager`)
4. Add `utils.ts` to `.gitignore` — never commit credentials
5. Optional but recommended: replace hardcoded credentials with `process.env.TEST_ADMIN_LOGIN` etc.

---

## Script 1: CSV → TypeScript spec

Converts an Xray-exported CSV test plan into a ready-to-use Playwright spec file.

```bash
npx ts-node scripts/csv-to-spec.ts <input.csv> [output.spec.ts]
```

**Example**:

```bash
npx ts-node scripts/csv-to-spec.ts mon-export.csv output/ma-feature.spec.ts
```

If the second argument is omitted, the output file is placed next to the input file with `.spec.ts` appended to the base name.

**Expected outcome**:
- A `.spec.ts` file is created at the specified path
- One `test()` block per test case identified in the CSV
- One `test.step()` + `runStep()` block per action row
- Each step includes the `attenduEtape` from the `Résultat Attendu` column
- For `Admin` profile rows, a `loginAdmin()` call is injected at the start of the test

**Validation**:
```bash
# Vérifier que le nombre de blocs test() correspond aux identifiants distincts du CSV
grep -c "^test(" output/ma-feature.spec.ts
```

---

## Script 2: Playwright Codegen → TypeScript spec

Converts raw Playwright Codegen output into a structured spec file with auto-generated expected results.

```bash
npx ts-node scripts/codegen-to-spec.ts <input.txt> [output.spec.ts]
```

**Example**:

```bash
npx ts-node scripts/codegen-to-spec.ts codegen-recording.txt output/recording_generated.spec.ts
```

**Codegen input file format**: plain text, paste the Codegen output as-is. The script expects at least one `test(...)` block or bare action lines.

**Expected outcome**:
- A `.spec.ts` file is created at the specified path
- Each recorded browser action is wrapped in a `test.step()` + `runStep()` block
- `attenduEtape` is auto-generated in French from the action (e.g., a `.click()` on a button named "Valider" produces `"Clic sur le bouton Valider"`)
- Lines the parser cannot classify are preserved verbatim with a `// TODO: décrire le résultat attendu` placeholder

**Validation**:
```bash
# Confirm the output is syntactically valid TypeScript
npx tsc --noEmit --allowJs output/recording_generated.spec.ts
```

---

## Error Cases

| Situation | Expected behaviour |
|---|---|
| Input file not found | Error message: `Erreur : fichier introuvable : <path>` — no output file created |
| Input file is empty | Error message: `Erreur : le fichier est vide : <path>` — no output file created |
| CSV has no valid data rows | Error message listing the issue; no output file created |
| Output file already exists | File is overwritten with a console warning |
| Unrecognised action in codegen | Line preserved verbatim; `// TODO` placeholder added |

---

## Running Both Scripts (Smoke Test)

```bash
# From the project root
npm install
npx ts-node scripts/csv-to-spec.ts mon-export.csv out-csv.spec.ts
npx ts-node scripts/codegen-to-spec.ts mon-recording.txt out-codegen.spec.ts
echo "Both scripts ran successfully"
```
