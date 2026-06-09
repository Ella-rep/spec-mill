# Quickstart: Init Utils Command

**Date**: 2026-06-09 | **Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

---

## Prerequisites

- `npm install` already run at the playwright-moulinette project root
- `utils.ts` present at the project root (it is committed to the repo)

---

## Scenario 1: Copy to explicit destination

```bash
npx ts-node scripts/init-utils.ts ./my-playwright-project/
```

Or via npm alias:

```bash
npm run init-utils -- ./my-playwright-project/
```

**Expected output**:
```
✓ utils.ts copied to /absolute/path/to/my-playwright-project/utils.ts
→ Edit utils.ts: update the site URL in login() and credentials in TEST_USERS
```

**Verify**:
```bash
# File exists at destination
ls ./my-playwright-project/utils.ts
```

---

## Scenario 2: Auto-copy to current directory

```bash
cd ./my-playwright-project/
npx ts-node /path/to/playwright-moulinette/scripts/init-utils.ts --auto
```

Or:

```bash
cd ./my-playwright-project/
npm run --prefix /path/to/playwright-moulinette init-utils -- --auto
```

**Expected output**:
```
✓ utils.ts copied to /absolute/path/to/my-playwright-project/utils.ts
→ Edit utils.ts: update the site URL in login() and credentials in TEST_USERS
```

---

## Scenario 3: Both explicit path and --auto (explicit wins)

```bash
npx ts-node scripts/init-utils.ts ./dest-path/ --auto
```

**Expected**: file copied to `./dest-path/utils.ts`, not to cwd.

---

## Error scenarios

| Situation | Expected message |
|-----------|-----------------|
| No args, no `--auto` | `Usage : npx ts-node scripts/init-utils.ts <destination> [--auto]` |
| `utils.ts` missing from tool root | `Erreur : utils.ts introuvable : <path>` |
| Destination file already exists | `Attention : utils.ts existe déjà à <path>, le fichier sera écrasé.` then copies |
| Destination directory created | Silent — directory created automatically |

---

## After copying

Edit the copied `utils.ts`:
1. Replace `https://mon-site.com` in `login()` with your actual site URL
2. Replace placeholder credentials in `TEST_USERS` with real test credentials
3. Add `utils.ts` to your project's `.gitignore`
