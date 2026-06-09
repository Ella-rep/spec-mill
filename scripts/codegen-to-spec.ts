/**
 * codegen-to-spec.ts
 *
 * Convertit un fichier texte contenant du code généré par Playwright Codegen
 * en un fichier spec Playwright suivant le modèle de `admin_recette_excel.spec.ts`.
 *
 * Pour chaque action enregistrée, le script génère automatiquement une description
 * en français utilisée comme `attenduEtape`.
 *
 * Usage:
 *   npx ts-node scripts/codegen-to-spec.ts <recording.txt> [sortie.spec.ts]
 *   npm run codegen-to-spec -- <recording.txt> [sortie.spec.ts]
 */

import * as fs from 'fs';
import * as path from 'path';
import { slugify, resolveOutputPath } from './shared';

// ---------------------------------------------------------------------------
// Types (T010)
// ---------------------------------------------------------------------------

/**
 * Catégorie d'action détectée dans une ligne de code Codegen.
 */
enum ActionType {
  GOTO          = 'GOTO',
  CLICK         = 'CLICK',
  FILL          = 'FILL',
  CHECK         = 'CHECK',
  UNCHECK       = 'UNCHECK',
  SELECT        = 'SELECT',
  PRESS         = 'PRESS',
  HOVER         = 'HOVER',
  EXPECT_VISIBLE = 'EXPECT_VISIBLE',
  EXPECT_TEXT   = 'EXPECT_TEXT',
  EXPECT_CLASS  = 'EXPECT_CLASS',
  UNKNOWN       = 'UNKNOWN',
}

/**
 * Représente une ligne d'action issue du fichier Codegen, après analyse.
 *
 * @property raw                 - Ligne brute telle qu'elle apparaît dans le fichier source
 * @property actionType          - Type d'action détecté
 * @property selectorDescription - Étiquette lisible extraite de l'expression de localisation
 * @property value               - Valeur associée (texte saisi, option choisie, touche pressée…)
 * @property inferredExpected    - Résultat attendu généré automatiquement en français
 */
interface CodegenLine {
  raw: string;
  actionType: ActionType;
  selectorDescription: string;
  value: string;
  inferredExpected: string;
}

// ---------------------------------------------------------------------------
// Regex catalogue (T011)
// ---------------------------------------------------------------------------

/**
 * Catalogue de patterns regex associés à chaque type d'action Playwright.
 *
 * L'ordre est important : les patterns les plus spécifiques (ex. EXPECT_TEXT)
 * doivent apparaître avant les patterns génériques (ex. CLICK).
 *
 * Groupes de capture :
 * - Pour GOTO      : groupe 1 = URL
 * - Pour FILL      : groupe 1 = valeur saisie
 * - Pour SELECT    : groupe 1 = option sélectionnée
 * - Pour PRESS     : groupe 1 = touche
 * - Pour EXPECT_TEXT  : groupe 1 = texte attendu
 * - Pour EXPECT_CLASS : groupe 1 = classe CSS attendue
 */
const PATTERNS: { type: ActionType; regex: RegExp; valueGroup?: number }[] = [
  { type: ActionType.GOTO,           regex: /page\.goto\(['"](.+?)['"]\)/,                valueGroup: 1 },
  { type: ActionType.EXPECT_TEXT,    regex: /\.toHaveText\(['"](.+?)['"]\)/,              valueGroup: 1 },
  { type: ActionType.EXPECT_CLASS,   regex: /\.toHaveClass\(['"](.+?)['"]\)/,             valueGroup: 1 },
  { type: ActionType.EXPECT_VISIBLE, regex: /\.toBeVisible\(\)/                                        },
  { type: ActionType.FILL,           regex: /\.fill\(['"](.+?)['"]\)/,                    valueGroup: 1 },
  { type: ActionType.CHECK,          regex: /\.check\(\)/                                              },
  { type: ActionType.UNCHECK,        regex: /\.uncheck\(\)/                                            },
  { type: ActionType.SELECT,         regex: /\.selectOption\(['"](.+?)['"]\)/,            valueGroup: 1 },
  { type: ActionType.PRESS,          regex: /\.press\(['"](.+?)['"]\)/,                   valueGroup: 1 },
  { type: ActionType.HOVER,          regex: /\.hover\(\)/                                              },
  { type: ActionType.CLICK,          regex: /\.click\(\)/                                              },
];

// ---------------------------------------------------------------------------
// Selector label extractor (T012)
// ---------------------------------------------------------------------------

/**
 * Extrait une étiquette lisible depuis une expression de localisation Playwright.
 *
 * Exemples de conversions :
 * - `getByRole('button', { name: 'Valider' })` → `"bouton Valider"`
 * - `getByRole('textbox', { name: 'Email' })` → `"champ Email"`
 * - `getByRole('checkbox', { name: 'Accepter' })` → `"case à cocher Accepter"`
 * - `getByText('Bienvenue')` → `"Bienvenue"`
 * - `getByLabel('Mot de passe')` → `"Mot de passe"`
 * - `page.locator('#submit')` → `"#submit"` (tronqué à 40 caractères si nécessaire)
 *
 * @param locatorExpr - Expression de localisation extraite d'une ligne Codegen
 * @returns           Étiquette lisible en français
 * @example
 * extractSelectorLabel("page.getByRole('button', { name: 'Valider' }).click()")
 * // => "bouton Valider"
 */
function extractSelectorLabel(locatorExpr: string): string {
  // getByRole avec name
  const roleWithName = locatorExpr.match(/getByRole\(['"](\w+)['"],\s*\{\s*name:\s*['"](.+?)['"]/);
  if (roleWithName) {
    const roleMap: Record<string, string> = {
      button: 'bouton',
      textbox: 'champ',
      checkbox: 'case à cocher',
      radio: 'bouton radio',
      link: 'lien',
      heading: 'titre',
      combobox: 'liste déroulante',
      option: 'option',
      tab: 'onglet',
      dialog: 'boîte de dialogue',
      tooltip: 'info-bulle',
    };
    const role = roleMap[roleWithName[1]] || roleWithName[1];
    return `${role} ${roleWithName[2]}`;
  }

  // getByRole sans name
  const roleOnly = locatorExpr.match(/getByRole\(['"](\w+)['"]\)/);
  if (roleOnly) {
    return roleOnly[1];
  }

  // getByText
  const byText = locatorExpr.match(/getByText\(['"](.+?)['"]\)/);
  if (byText) return byText[1];

  // getByLabel
  const byLabel = locatorExpr.match(/getByLabel\(['"](.+?)['"]\)/);
  if (byLabel) return byLabel[1];

  // getByPlaceholder
  const byPlaceholder = locatorExpr.match(/getByPlaceholder\(['"](.+?)['"]\)/);
  if (byPlaceholder) return `champ "${byPlaceholder[1]}"`;

  // getByTestId
  const byTestId = locatorExpr.match(/getByTestId\(['"](.+?)['"]\)/);
  if (byTestId) return byTestId[1];

  // locator avec sélecteur CSS ou texte brut
  const locator = locatorExpr.match(/locator\(['"](.+?)['"]\)/);
  if (locator) {
    const sel = locator[1];
    return sel.length > 40 ? sel.slice(0, 40) + '…' : sel;
  }

  // Fallback : tronquer l'expression brute
  const clean = locatorExpr.replace(/\s+/g, ' ').trim();
  return clean.length > 40 ? clean.slice(0, 40) + '…' : clean;
}

// ---------------------------------------------------------------------------
// Expected result generator (T013)
// ---------------------------------------------------------------------------

/**
 * Génère automatiquement un résultat attendu en français à partir d'une ligne analysée.
 *
 * Applique la table de correspondance définie dans `research.md` :
 * action détectée → description en français.
 *
 * @param line - Ligne Codegen analysée (avec `actionType`, `selectorDescription`, `value`)
 * @returns    Description en français du résultat attendu
 * @example
 * inferExpected({ actionType: ActionType.CLICK, selectorDescription: 'bouton Valider', value: '', ... })
 * // => "Clic sur bouton Valider"
 */
function inferExpected(line: CodegenLine): string {
  switch (line.actionType) {
    case ActionType.GOTO:
      return `Navigation vers ${line.value}`;
    case ActionType.CLICK:
      return `Clic sur ${line.selectorDescription}`;
    case ActionType.FILL:
      return `Saisie "${line.value}" dans ${line.selectorDescription}`;
    case ActionType.CHECK:
      return `Cocher ${line.selectorDescription}`;
    case ActionType.UNCHECK:
      return `Décocher ${line.selectorDescription}`;
    case ActionType.SELECT:
      return `Sélection de "${line.value}" dans ${line.selectorDescription}`;
    case ActionType.PRESS:
      return `Appui sur la touche ${line.value}`;
    case ActionType.HOVER:
      return `Survol de ${line.selectorDescription}`;
    case ActionType.EXPECT_VISIBLE:
      return `${line.selectorDescription} est visible`;
    case ActionType.EXPECT_TEXT:
      return `${line.selectorDescription} contient le texte "${line.value}"`;
    case ActionType.EXPECT_CLASS:
      return `${line.selectorDescription} a la classe "${line.value}"`;
    case ActionType.UNKNOWN:
    default:
      return '// TODO: décrire le résultat attendu';
  }
}

// ---------------------------------------------------------------------------
// Codegen parser (T014)
// ---------------------------------------------------------------------------

/**
 * Analyse un texte Codegen Playwright et retourne le nom du test ainsi que
 * la liste des lignes d'action structurées.
 *
 * Lignes ignorées :
 * - Lignes vides
 * - Instructions `import`
 * - Lignes contenant uniquement `{` ou `}`
 * - Déclarations `test.describe` et `test.use`
 * - Déclaration `test(` de départ (le nom du test en est extrait)
 *
 * @param text - Contenu brut du fichier Codegen
 * @returns    Objet `{ testName, lines }` où `lines` est la liste des CodegenLine
 * @example
 * const { testName, lines } = parseCodegen(fs.readFileSync('recording.txt', 'utf-8'));
 */
function parseCodegen(text: string): { testName: string; lines: CodegenLine[] } {
  const rawLines = text.split(/\r?\n/);
  let testName = 'Test généré';
  const lines: CodegenLine[] = [];

  for (const raw of rawLines) {
    const trimmed = raw.trim();

    // Ignorer les lignes structurelles et vides
    if (trimmed === '') continue;
    if (trimmed.startsWith('import ')) continue;
    if (trimmed === '{' || trimmed === '});' || trimmed === '})' || trimmed === '}') continue;
    if (trimmed.startsWith('test.describe') || trimmed.startsWith('test.use')) continue;

    // Extraire le nom du test
    const testNameMatch = trimmed.match(/^(?:const\s+\w+\s*=\s*)?test\(\s*['"](.+?)['"]/);
    if (testNameMatch) {
      testName = testNameMatch[1];
      continue;
    }

    // Ignorer les lignes `async ({ page }) => {` et similaires
    if (/^async\s*\(/.test(trimmed)) continue;

    // Détecter le type d'action
    let detectedType = ActionType.UNKNOWN;
    let capturedValue = '';

    for (const pattern of PATTERNS) {
      const match = trimmed.match(pattern.regex);
      if (match) {
        detectedType = pattern.type;
        if (pattern.valueGroup !== undefined) {
          capturedValue = match[pattern.valueGroup] || '';
        }
        break;
      }
    }

    const selectorDescription = extractSelectorLabel(trimmed);

    const codeLine: CodegenLine = {
      raw: trimmed,
      actionType: detectedType,
      selectorDescription,
      value: capturedValue,
      inferredExpected: '', // rempli après
    };
    codeLine.inferredExpected = inferExpected(codeLine);

    lines.push(codeLine);
  }

  return { testName, lines };
}

// ---------------------------------------------------------------------------
// Spec generator (T015)
// ---------------------------------------------------------------------------

/**
 * Génère le contenu d'un fichier spec Playwright à partir des lignes Codegen analysées.
 *
 * Chaque ligne produit un bloc `test.step()` + `runStep()` avec l'`attenduEtape`
 * généré automatiquement. Les lignes UNKNOWN sont conservées en commentaire dans
 * le corps du step.
 *
 * @param testName - Nom du test extrait du fichier Codegen (ou valeur par défaut)
 * @param lines    - Liste de CodegenLine retournée par `parseCodegen`
 * @returns         Contenu complet du fichier `.spec.ts`
 * @example
 * const spec = generateSpec('Mon test', lines);
 * fs.writeFileSync('output.spec.ts', spec, 'utf-8');
 */
function generateSpec(testName: string, lines: CodegenLine[]): string {
  const output: string[] = [];

  output.push(`import { runStep, login, postLogin, TEST_USERS } from '../utils';`);
  output.push(`import { test, expect } from '@playwright/test';`);
  output.push('');
  output.push(`test.describe.configure({ mode: 'serial' });`);
  output.push('');
  output.push(`test(${JSON.stringify(testName)}, async ({ page }, testInfo) => {`);
  output.push(`  let stepIndex = 1;`);

  for (const line of lines) {
    const attendu = line.inferredExpected
      .replace(/\\/g, '\\\\')
      .replace(/"/g, '\\"');

    const stepLabel = line.actionType === ActionType.UNKNOWN
      ? line.raw.slice(0, 60)
      : line.inferredExpected;

    const stepId = slugify(
      line.actionType === ActionType.UNKNOWN ? 'action-inconnue' : line.inferredExpected
    );

    output.push('');
    output.push(`  await test.step(${JSON.stringify(stepLabel)}, async () => {`);
    output.push(`    const attenduEtape = "${attendu}";`);
    output.push(`    await testInfo.attach('attendu-etape', { body: attenduEtape, contentType: 'text/plain' });`);
    output.push(`    await runStep(page, testInfo, ${JSON.stringify(stepId)}, stepIndex++, async () => {`);

    if (line.actionType === ActionType.UNKNOWN) {
      output.push(`      // ${line.raw}`);
      output.push(`      // TODO: vérifier ou remplacer cette action non reconnue`);
    } else {
      output.push(`      ${line.raw}`);
    }

    output.push(`    });`);
    output.push(`  });`);
  }

  output.push(`});`);

  return output.join('\n') + '\n';
}

// ---------------------------------------------------------------------------
// CLI entry point (T016)
// ---------------------------------------------------------------------------

const args = process.argv.slice(2);

if (args.length === 0) {
  console.error('Usage : npx ts-node scripts/codegen-to-spec.ts <recording.txt> [sortie.spec.ts]');
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

const { testName, lines } = parseCodegen(rawContent);

if (lines.length === 0) {
  console.error('Erreur : aucune action reconnue dans le fichier Codegen.');
  process.exit(1);
}

const spec = generateSpec(testName, lines);
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, spec, 'utf-8');

console.log(`✓ ${lines.length} étapes converties → ${outputPath}`);
