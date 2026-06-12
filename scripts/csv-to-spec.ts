/**
 * csv-to-spec.ts
 *
 * Convertit un fichier CSV exporté depuis Xray (Jira) en un fichier spec Playwright
 * suivant le modèle de `admin_recette_excel.spec.ts`.
 *
 * Usage:
 *   npx ts-node scripts/csv-to-spec.ts <fichier.csv> [sortie.spec.ts]
 *   npm run csv-to-spec -- <fichier.csv> [sortie.spec.ts]
 *
 * Le séparateur attendu est le point-virgule (`;`). La première ligne est l'en-tête.
 */

import * as fs from 'fs';
import * as path from 'path';
import { slugify, resolveOutputPath } from './shared';

// ---------------------------------------------------------------------------
// Types (T004)
// ---------------------------------------------------------------------------

/**
 * Représente une étape individuelle d'un cas de test.
 *
 * @property action         - Texte de l'action (colonne 4 du CSV : "Action")
 * @property expectedResult - Résultat attendu (colonne 6 : "Résultat Attendu")
 * @property stepId         - Identifiant kebab-case dérivé de l'action, utilisé dans `runStep`
 */
interface TestStep {
  action: string;
  expectedResult: string;
  stepId: string;
}

/**
 * Représente un cas de test complet, regroupant toutes ses étapes.
 *
 * @property identifier - Identifiant unique (colonne 2 : "Identificateur de cas de test")
 * @property summary    - Résumé du test (colonne 3 : "Résumé"), pris sur la première ligne du groupe
 * @property profile    - Profil utilisateur (colonne 8 : "Données"), ex. "Admin"
 * @property steps      - Liste ordonnée des étapes
 */
interface TestCase {
  identifier: string;
  summary: string;
  profile: string;
  steps: TestStep[];
}

// ---------------------------------------------------------------------------
// CSV parsing (T005)
// ---------------------------------------------------------------------------

/**
 * Découpe une ligne CSV délimitée par des points-virgules en un tableau de champs.
 *
 * Gère les valeurs entre guillemets doubles (y compris l'échappement `""` → `"`)
 * et supprime les espaces en début et fin de chaque champ.
 *
 * @param line - Une ligne brute du fichier CSV
 * @returns   Tableau de chaînes correspondant aux colonnes
 * @example
 * parseCSVLine('test;Manual;"Bouton ""créer""";Moyenne')
 * // => ['test', 'Manual', 'Bouton "créer"', 'Moyenne']
 */
function parseCSVLine(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];

    if (inQuotes) {
      if (ch === '"') {
        // Deux guillemets consécutifs = guillemet échappé
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ';') {
        fields.push(current.trim());
        current = '';
      } else {
        current += ch;
      }
    }
  }
  fields.push(current.trim());
  return fields;
}

// ---------------------------------------------------------------------------
// CSV loader (T006)
// ---------------------------------------------------------------------------

/**
 * Lit un fichier CSV Xray et retourne la liste des cas de test structurés.
 *
 * Règles de traitement :
 * - La première ligne (en-tête) est ignorée.
 * - Les lignes dont la colonne "Identificateur" (col 2) est vide héritent
 *   de l'identifiant de la ligne précédente.
 * - Les lignes dont l'"Action" (col 4) est vide sont ignorées.
 * - Les étapes sont regroupées par identifiant dans l'ordre d'apparition.
 *
 * @param filePath - Chemin vers le fichier CSV
 * @returns        Liste de TestCase dans l'ordre de première apparition des identifiants
 * @example
 * const cases = loadCSV('ExportXray_Admin.csv');
 * // cases[0].identifier === 'Affichage tableau sur la page d\'accueil Admin'
 */
function loadCSV(filePath: string): TestCase[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split(/\r?\n/).filter(l => l.trim() !== '');

  // Ignorer l'en-tête
  const dataLines = lines.slice(1);

  const caseMap = new Map<string, TestCase>();
  const caseOrder: string[] = [];
  let lastIdentifier = '';

  for (const line of dataLines) {
    const cols = parseCSVLine(line);

    // Colonnes attendues : 0=type, 1=typeTest, 2=identificateur, 3=résumé,
    //                       4=action, 5=priorité, 6=résultatAttendu, 7=chemin, 8=données
    const rawIdentifier = cols[2] || '';
    const summary       = cols[3] || '';
    const action        = cols[4] || '';
    const expectedResult = cols[6] || '';
    const profile       = cols[8] || '';

    // Héritage de l'identifiant
    const identifier = rawIdentifier !== '' ? rawIdentifier : lastIdentifier;
    if (identifier === '') continue; // ligne avant tout identifiant connu
    lastIdentifier = identifier;

    // Ignorer les lignes sans action
    if (action === '') continue;

    // Créer ou récupérer le cas de test
    if (!caseMap.has(identifier)) {
      caseMap.set(identifier, {
        identifier,
        summary: summary || identifier,
        profile,
        steps: [],
      });
      caseOrder.push(identifier);
    } else if (profile && !caseMap.get(identifier)!.profile) {
      // Mettre à jour le profil si la ligne courante le précise
      caseMap.get(identifier)!.profile = profile;
    }

    caseMap.get(identifier)!.steps.push({
      action,
      expectedResult,
      stepId: slugify(action),
    });
  }

  return caseOrder.map(id => caseMap.get(id)!);
}

// ---------------------------------------------------------------------------
// Assertion generator (T001 — feature 002)
// ---------------------------------------------------------------------------

/**
 * Génère les lignes d'assertions Playwright pour une étape à partir du texte
 * du `Résultat Attendu`. Applique 6 patrons dans l'ordre de priorité décrit
 * dans `specs/002-csv-assertions-gen/research.md`.
 *
 * @param expectedResult - Texte de la colonne "Résultat Attendu"
 * @returns Tableau de lignes TypeScript à insérer dans le corps du `runStep`
 * @example
 * generateAssertions("Une pop-in confirmation apparait")
 * // => ["// TODO: vérifier/modifier les assertions générées",
 * //     "await expect(page.getByRole('dialog')).toBeVisible();"]
 */
function generateAssertions(expectedResult: string): string[] {
  if (!expectedResult.trim()) {
    return ['// TODO: vérifier/modifier les assertions'];
  }

  const TODO = '// TODO: vérifier/modifier les assertions générées';
  const lower = expectedResult.toLowerCase();

  // Priority 1 — Pop-in / modal
  if (/pop-in|popin|fenêtre de confirmation/i.test(expectedResult)) {
    return [TODO, "await expect(page.getByRole('dialog')).toBeVisible();"];
  }

  // Priority 2 — Named button + disabled
  const buttonMatch = expectedResult.match(/bouton\s+"?([^",\n.]+?)"?(?:\s|$|,|\.)/i);
  const buttonName = buttonMatch?.[1]?.trim();
  if (buttonName && /grisé|non cliquable|désactivé/i.test(lower)) {
    return [TODO, `await expect(page.getByRole('button', { name: '${buttonName.replace(/'/g, "\\'")}' })).toHaveClass(/.*disabled.*/);`];
  }

  // Priority 3 — Named button + visible
  if (buttonName && /visible|apparaît|présent|affiché/i.test(lower)) {
    return [TODO, `await expect(page.getByRole('button', { name: '${buttonName.replace(/'/g, "\\'")}' })).toBeVisible();`];
  }

  // Priority 4 — Text field
  const fieldMatch = expectedResult.match(/champ\s+"?([^",\n.]+?)"?(?:\s|$|,|\.)/i);
  const fieldName = fieldMatch?.[1]?.trim();
  if (fieldName) {
    return [TODO, `await expect(page.getByRole('textbox', { name: '${fieldName.replace(/'/g, "\\'")}' })).toBeVisible();`];
  }

  // Priority 5 — Quoted strings + visibility keyword
  const quotedMatches = [...expectedResult.matchAll(/"([^"]+)"/g)].map(m => m[1]).slice(0, 3);
  if (quotedMatches.length > 0 && /visible|apparaît|présent|affiché/i.test(lower)) {
    const lines: string[] = [TODO];
    for (const q of quotedMatches) {
      lines.push(`await expect(page.getByText('${q.replace(/'/g, "\\'")}')).toBeVisible();`);
    }
    return lines;
  }

  // Priority 6 — Fallback: use raw text truncated to 80 chars
  const shortText = expectedResult.substring(0, 80).replace(/'/g, "\\'");
  return [TODO, `await expect(page.getByText('${shortText}')).toBeVisible();`];
}

// ---------------------------------------------------------------------------
// Spec generator (T007)
// ---------------------------------------------------------------------------

/**
 * Génère le contenu d'un fichier spec Playwright à partir d'une liste de cas de test.
 *
 * Produit :
 * - Les imports standards
 * - `test.describe.configure({ mode: 'serial' })`
 * - Un bloc `test()` par cas de test
 * - Une injection de `loginAdmin` si le profil est "Admin"
 * - Un bloc `test.step()` + `runStep()` par étape, avec `attenduEtape`
 *
 * @param cases - Liste de TestCase retournée par `loadCSV`
 * @returns      Chaîne représentant le contenu complet du fichier `.spec.ts`
 * @example
 * const spec = generateSpec(cases);
 * fs.writeFileSync('output.spec.ts', spec, 'utf-8');
 */
function generateSpec(cases: TestCase[]): string {
  const lines: string[] = [];

  lines.push(`import { runStep, login, postLogin, TEST_USERS } from '../utils';`);
  lines.push(`import { test, expect } from '@playwright/test';`);
  lines.push('');
  lines.push(`test.describe.configure({ mode: 'serial' });`);
  lines.push('');
  lines.push(`/**`);
  lines.push(` * Connexion à l'application — à compléter selon votre système d'authentification.`);
  lines.push(` * Appelée automatiquement au début de chaque test.`);
  lines.push(` *`);
  lines.push(` * Exemple avec utils.ts (système Gardian) :`);
  lines.push(` *   await login(page, TEST_USERS.admin.login, TEST_USERS.admin.password);`);
  lines.push(` *   await postLogin(page, TEST_USERS.admin.login);`);
  lines.push(` */`);
  lines.push(`async function loginBeforeTest(page: any, testInfo: any, stepIndex: number): Promise<number> {`);
  lines.push(`  await test.step('Connexion', async () => {`);
  lines.push(`    const attenduEtape = "Connexion à l'application";`);
  lines.push(`    await testInfo.attach('attendu-etape', { body: attenduEtape, contentType: 'text/plain' });`);
  lines.push(`    await runStep(page, testInfo, 'connexion', stepIndex++, async () => {`);
  lines.push(`      // TODO: implémenter la connexion à votre application`);
  lines.push(`      // Exemple Gardian : await login(page, TEST_USERS.admin.login, TEST_USERS.admin.password);`);
  lines.push(`    });`);
  lines.push(`  });`);
  lines.push(`  return stepIndex;`);
  lines.push(`}`);

  for (const tc of cases) {
    lines.push('');
    lines.push(`test(${JSON.stringify(tc.summary)}, async ({ page }, testInfo) => {`);
    lines.push(`  let stepIndex = 1;`);
    lines.push(`  stepIndex = await loginBeforeTest(page, testInfo, stepIndex);`);

    for (const step of tc.steps) {
      const attendu = step.expectedResult
        .replace(/\\/g, '\\\\')
        .replace(/"/g, '\\"')
        .replace(/\n/g, '\\n');

      lines.push('');
      lines.push(`  await test.step(${JSON.stringify(step.action)}, async () => {`);
      lines.push(`    const attenduEtape = "${attendu}";`);
      lines.push(`    await testInfo.attach('attendu-etape', { body: attenduEtape, contentType: 'text/plain' });`);
      lines.push(`    await runStep(page, testInfo, ${JSON.stringify(step.stepId)}, stepIndex++, async () => {`);
      for (const line of generateAssertions(step.expectedResult)) {
        lines.push(`      ${line}`);
      }
      lines.push(`    });`);
      lines.push(`  });`);
    }

    lines.push(`});`);
  }

  return lines.join('\n') + '\n';
}

// ---------------------------------------------------------------------------
// CLI entry point (T008)
// ---------------------------------------------------------------------------

const args = process.argv.slice(2);

if (args.length === 0) {
  console.error('Usage : npx ts-node scripts/csv-to-spec.ts <fichier.csv> [sortie.spec.ts]');
  process.exit(1);
}

const inputPath = path.resolve(args[0]);
const outputPath = path.resolve(resolveOutputPath(args[0], args[1]));

if (!fs.existsSync(inputPath)) {
  console.error(`Erreur : fichier introuvable : ${inputPath}`);
  process.exit(1);
}

const rawContent = fs.readFileSync(inputPath, 'utf-8');
if (rawContent.trim() === '') {
  console.error(`Erreur : le fichier est vide : ${inputPath}`);
  process.exit(1);
}

if (fs.existsSync(outputPath)) {
  console.warn(`Attention : le fichier de sortie existe déjà et sera écrasé : ${outputPath}`);
}

const cases = loadCSV(inputPath);

if (cases.length === 0) {
  console.error('Erreur : aucun cas de test valide trouvé dans le fichier CSV.');
  process.exit(1);
}

const spec = generateSpec(cases);
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, spec, 'utf-8');

console.log(`✓ ${cases.length} cas de test convertis → ${outputPath}`);
