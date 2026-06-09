import { expect, Page, TestInfo, test } from '@playwright/test';

import * as fs from 'node:fs/promises';

import * as path from 'node:path';

 

type TestCredentials = {

  login: string;

  password: string;

};

 

export const TEST_USERS: Record<'admin' | 'manager', TestCredentials> = {

  admin: {

    login: 'ffff',

    password: '!gggg000!',

  },

  manager: {

    login: 'fff',

    password: '@fff',

  },

};

 

const testOrderBySpec = new Map<string, Map<string, number>>();

 

function getTestOrder(testInfo: TestInfo): number {

  const specPath = testInfo.file || 'unknown-spec';

  const testTitle = testInfo.title || 'unknown-test';

  let fileMap = testOrderBySpec.get(specPath);

  if (!fileMap) {

    fileMap = new Map<string, number>();

    testOrderBySpec.set(specPath, fileMap);

  }

  let testOrder = fileMap.get(testTitle);

  if (!testOrder) {

    testOrder = fileMap.size + 1;

    fileMap.set(testTitle, testOrder);

  }

  return testOrder;

}

 

export async function login(page: Page, login: string, mdp: string) {

  await page.goto('https://mon-site.com');

  await page.getByRole('textbox', { name: 'NNI / PseudoNNI / e-id' }).click();

  await page.getByRole('textbox', { name: 'NNI / PseudoNNI / e-id' }).fill(login);

  await page.getByRole('textbox', { name: 'NNI / PseudoNNI / e-id' }).press('Tab');

  await page.getByLabel(/Password|Mot de passe/i).fill(mdp);

}

 

export async function postLogin(page: Page, login: string) {  

  await page.getByRole('button', { name: /Log in|Connexion|Se connecter/i }).click();

  // Vérifier que l'utilisateur est connecté en affichant le login saisi (insensible à la casse)

  await expect(page.getByText(/Bienvenue sur Mon site/i)).toBeVisible({ timeout: 15000 });

  await expect(page.getByText(/Chargement des données.../i)).not.toBeVisible({ timeout: 15000 });

  const escapedLogin = login.replace(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);

  const userNni = page.locator('[class*="header_userinfos--nni"]').first();

  await expect(userNni).toBeVisible({ timeout: 15000 });

  await expect(userNni).toHaveText(new RegExp(`^${escapedLogin}$`, 'i'), { timeout: 15000 });

}

 

export function safeName(value: string) {

  return value

    .toLowerCase()

    .normalize('NFD')

    .replace(/[\u0300-\u036f]/g, '')

    .replace(/[^a-z0-9]+/g, '-')

    .replace(/^-+|-+$/g, '');

}

 

export async function captureStep(page: Page, testInfo: TestInfo, stepName: string, stepIndex: number) {

  const stepNumber = String(stepIndex).padStart(2, '0');

  const testNumber = String(getTestOrder(testInfo)).padStart(2, '0');

  const testDir = testInfo.file ? path.dirname(testInfo.file) : '.';

  const file = path.join(testDir, `Test_${testNumber}-Etape_${stepNumber}-${safeName(stepName)}.jpg`);

  try {

    await fs.unlink(file);

  } catch (error) {

    if (!error || typeof error !== 'object' || !('code' in error) || error.code !== 'ENOENT') {

      throw error;

    }

  }

  await page.screenshot({ path: file, type: 'jpeg', quality: 80, fullPage: true });

}

 

export async function runStep(

  page: Page,

  testInfo: TestInfo,

  stepName: string,

  stepIndex: number,

  action: () => Promise<void>

) {

  await test.step(stepName, async () => {

    await action();

    await captureStep(page, testInfo, stepName, stepIndex);

  });

}