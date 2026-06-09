import * as fs from 'fs';
import * as path from 'path';

const args = process.argv.slice(2);
const autoFlag = args.includes('--auto');
const destArg = args.find(a => !a.startsWith('--'));

let dest: string;

if (destArg) {
  dest = path.resolve(destArg);
} else if (autoFlag) {
  dest = process.cwd();
} else {
  console.error('Usage : npx ts-node scripts/init-utils.ts <destination> [--auto]');
  process.exit(1);
}

const sourcePath = path.join(__dirname, '..', 'utils.ts');

if (!fs.existsSync(sourcePath)) {
  console.error(`Erreur : utils.ts introuvable : ${sourcePath}`);
  process.exit(1);
}

const destFile = path.join(dest, 'utils.ts');

if (fs.existsSync(destFile)) {
  console.warn(`Attention : utils.ts existe déjà à ${destFile}, le fichier sera écrasé.`);
}

fs.mkdirSync(dest, { recursive: true });
fs.copyFileSync(sourcePath, destFile);

console.log(`✓ utils.ts copié vers ${destFile}`);
console.log(`→ Éditez utils.ts : mettez à jour l'URL du site dans login() et les identifiants dans TEST_USERS`);
