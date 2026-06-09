import * as path from 'path';

/**
 * Converts a French text string into a kebab-case step ID suitable for use
 * as a Playwright `runStep` identifier.
 *
 * Strips accented characters, lowercases everything, and replaces any sequence
 * of non-alphanumeric characters with a single hyphen. Leading and trailing
 * hyphens are removed.
 *
 * @param text - The input string, e.g. an action label from the CSV
 * @returns A kebab-case slug, e.g. `"cliquer-sur-le-bouton-creer"`
 * @example
 * slugify("Cliquer sur le bouton Créer")
 * // => "cliquer-sur-le-bouton-creer"
 *
 * slugify("Vérifier la présence du sommaire")
 * // => "verifier-la-presence-du-sommaire"
 */
export function slugify(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Derives the output file path for a generated spec.
 *
 * If an explicit `override` path is provided it is returned as-is. Otherwise
 * the default is built by replacing the input file's extension with `.spec.ts`.
 *
 * @param inputPath  - Absolute or relative path to the input file
 * @param override   - Optional explicit output path supplied on the CLI
 * @returns The resolved output file path
 * @example
 * resolveOutputPath('ExportXray_Admin.csv')
 * // => 'ExportXray_Admin.spec.ts'
 *
 * resolveOutputPath('recordings/session.txt', 'out/session.spec.ts')
 * // => 'out/session.spec.ts'
 */
export function resolveOutputPath(inputPath: string, override?: string): string {
  if (override) return override;
  const ext = path.extname(inputPath);
  return inputPath.slice(0, inputPath.length - ext.length) + '.spec.ts';
}
