# Spec-Mill -> Playwright

Deux scripts pour convertir automatiquement des fichiers de tests de non-régression (TNR) en fichiers spec Playwright, selon le format de `admin_recette_excel.spec.ts`.

---

## Contexte

Le PO maintient ses scénarios de TNR dans un fichier Excel (exporté depuis Xray/Jira). Il peut aussi enregistrer des actions via Playwright Codegen. Dans les deux cas, le développeur reçoit un fichier brut et doit produire un fichier `.spec.ts` structuré avec les étapes, les résultats attendus et les wrappers `runStep`.

Ces scripts automatisent cette conversion.

---

## Prérequis

- [Node.js](https://nodejs.org/) ≥ 18
- Installer les dépendances une seule fois :

```bash
npm install
```

- Puis dans le dossier spec-mill :

```bash
npm i --save-dev @types/node
```

> [!CAUTION]
> **Attention:** J'ai été bloquée dans WSL
> J'ai pu exécuter mes installations et scripts dans powershell

### Initialiser `utils.ts` dans un projet cible

Les specs générées importent les helpers depuis `utils.ts` à la racine du projet cible. Ce fichier contient les fonctions `runStep`, `captureStep`, `login`, `postLogin` et les credentials de test.

**Copier `utils.ts` automatiquement avec `init-utils` :**

```bash
# Copier vers un chemin explicite
npm run init-utils -- <chemin/vers/mon-projet>

# Copier vers le répertoire courant (si déjà dans le projet cible)
npm run init-utils -- --auto
```

**Exemples :**

```bash
# Depuis la racine de spec-mill
npm run init-utils -- ../mon-projet-playwright/

# Depuis le répertoire du projet cible
cd ../mon-projet-playwright/
npm run init-utils -- --auto
```

**Après la copie, configurer `utils.ts` dans le projet cible :**

1. Ouvrir `utils.ts` et mettre à jour :
   - L'URL du site dans la fonction `login` (`page.goto('https://...')`)
   - Les credentials dans `TEST_USERS` (`login` et `password` pour chaque profil)
2. Ajouter `utils.ts` au `.gitignore` du projet cible pour ne pas committer de credentials :
   ```
   utils.ts
   ```
3. Recommandé : lire les credentials depuis des variables d'environnement plutôt que de les hardcoder :
   ```typescript
   admin: {
     login: process.env.TEST_ADMIN_LOGIN ?? '',
     password: process.env.TEST_ADMIN_PASSWORD ?? '',
   }
   ```

---

## Script 1 — CSV Xray → spec Playwright

Convertit un fichier CSV exporté depuis Xray en fichier `.spec.ts`.

```bash
npx ts-node scripts/csv-to-spec.ts <fichier.csv> [sortie.spec.ts]
```

**Exemples :**

```bash
# Sortie automatique : mon-export.spec.ts
npx ts-node scripts/csv-to-spec.ts mon-export.csv

# Sortie personnalisée
npx ts-node scripts/csv-to-spec.ts mon-export.csv tests/ma-feature.spec.ts

# Via npm
npm run csv-to-spec -- mon-export.csv tests/ma-feature.spec.ts
```

### Format CSV attendu

Fichier exporté depuis Xray, séparateur `;`, encodage UTF-8. Colonnes utilisées :

| Colonne | Intitulé | Rôle |
|---------|----------|------|
| 2 | Identificateur de cas de test | Regroupe les étapes d'un même test |
| 3 | Résumé | Nom du bloc `test()` |
| 4 | Action | Description de l'étape |
| 6 | Résultat Attendu | Base pour générer les assertions Playwright |
| 8 | Données | Profil utilisateur (conservé en métadonnée, non utilisé pour le login) |

Les lignes dont la colonne "Identificateur" est vide héritent de l'identifiant de la ligne précédente. Les lignes sans "Action" sont ignorées.

### Fonction de connexion générée

Chaque spec généré contient une fonction `loginBeforeTest` à compléter :

```typescript
/**
 * Connexion à l'application — à compléter selon votre système d'authentification.
 * Appelée automatiquement au début de chaque test.
 */
async function loginBeforeTest(page: any, testInfo: any, stepIndex: number): Promise<number> {
  await test.step('Connexion', async () => {
    const attenduEtape = "Connexion à l'application";
    await testInfo.attach('attendu-etape', { body: attenduEtape, contentType: 'text/plain' });
    await runStep(page, testInfo, 'connexion', stepIndex++, async () => {
      // TODO: implémenter la connexion à votre application
      // Exemple Gardian : await login(page, TEST_USERS.admin.login, TEST_USERS.admin.password);
    });
  });
  return stepIndex;
}
```

Cette fonction est appelée en début de chaque test. Remplacer le commentaire `TODO` par la logique de connexion propre à votre application :

| Système | Implémentation |
|---------|---------------|
| SSO basique | `await page.goto('/login'); await page.fill('#user', '...'); await page.fill('#pass', '...'); await page.click('[type=submit]');` |
| Token JWT | `await page.evaluate(() => localStorage.setItem('token', '...'));` |
| Pas d'auth | Laisser le corps vide |

### Ce que produit le script

```typescript
import { runStep, login, postLogin, TEST_USERS } from '../utils';
import { test, expect } from '@playwright/test';

test.describe.configure({ mode: 'serial' });

async function loginBeforeTest(page: any, testInfo: any, stepIndex: number): Promise<number> {
  // ... voir ci-dessus
}

test('Nom du cas de test', async ({ page }, testInfo) => {
  let stepIndex = 1;
  stepIndex = await loginBeforeTest(page, testInfo, stepIndex);

  await test.step('Action de l\'étape', async () => {
    const attenduEtape = "Résultat attendu";
    await testInfo.attach('attendu-etape', { body: attenduEtape, contentType: 'text/plain' });
    await runStep(page, testInfo, 'action-de-l-etape', stepIndex++, async () => {
      // TODO: vérifier/modifier les assertions générées
      await expect(page.getByRole('button', { name: 'Valider' })).toBeVisible();
    });
  });
});
```

---

## Script 2 — Codegen Playwright → spec Playwright

Convertit un fichier texte contenant du code généré par Playwright Codegen en fichier `.spec.ts`. Les résultats attendus sont générés automatiquement en français à partir de chaque action.

```bash
npx ts-node scripts/codegen-to-spec.ts <recording.txt> [sortie.spec.ts]
```

**Exemples :**

```bash
# Sortie automatique : recording.spec.ts
npx ts-node scripts/codegen-to-spec.ts recording.txt

# Sortie personnalisée
npx ts-node scripts/codegen-to-spec.ts recording.txt tests/mon-test.spec.ts

# Via npm
npm run codegen-to-spec -- recording.txt tests/mon-test.spec.ts
```

### Format d'entrée

Coller directement la sortie de Playwright Codegen dans un fichier `.txt`. Le script reconnaît les actions suivantes :

| Action Codegen | `attenduEtape` généré |
|---|---|
| `page.goto('url')` | `Navigation vers url` |
| `.click()` | `Clic sur bouton X` |
| `.fill('valeur')` | `Saisie "valeur" dans champ X` |
| `.check()` | `Cocher champ X` |
| `.uncheck()` | `Décocher champ X` |
| `.selectOption('val')` | `Sélection de "val" dans liste X` |
| `.press('touche')` | `Appui sur la touche Tab` |
| `.hover()` | `Survol de élément X` |
| `expect(...).toBeVisible()` | `élément X est visible` |
| `expect(...).toHaveText('t')` | `élément X contient le texte "t"` |
| Ligne non reconnue | `// TODO: décrire le résultat attendu` |

### Ce que produit le script

Même structure que le script CSV, avec un bloc `test.step()` + `runStep()` par action. Les lignes non reconnues sont conservées en commentaire avec un marqueur `TODO`.

---

## Après la conversion

Les fichiers générés contiennent des `// TODO` à réviser :
- **Script CSV** : chaque étape contient des assertions Playwright générées depuis le `Résultat Attendu`. Vérifier et ajuster les lignes marquées `// TODO: vérifier/modifier les assertions générées` avant d'exécuter.
- **Script Codegen** : les actions sont déjà présentes ; vérifier et ajuster les `attenduEtape` si nécessaire.

---

## Structure du projet

```
scripts/
├── shared.ts          # Utilitaires partagés (slugify, resolveOutputPath)
├── csv-to-spec.ts     # Script 1 : CSV Xray → spec
├── codegen-to-spec.ts # Script 2 : Codegen → spec
└── init-utils.ts      # Script 3 : copie utils.ts dans un projet cible

utils.ts               # Helpers Playwright (runStep, captureStep, login) — à configurer
package.json
tsconfig.json
```

---

## Gestion des erreurs

| Situation | Message affiché |
|---|---|
| Fichier introuvable | `Erreur : fichier introuvable : <chemin>` |
| Fichier vide | `Erreur : le fichier est vide : <chemin>` |
| Aucun cas de test valide (CSV) | `Erreur : aucun cas de test valide trouvé` |
| Aucune action reconnue (Codegen) | `Erreur : aucune action reconnue dans le fichier Codegen` |
| Fichier de sortie déjà existant | Avertissement + écrasement |
