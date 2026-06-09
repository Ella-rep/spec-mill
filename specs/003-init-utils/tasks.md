# Tasks: Init Utils Command

**Input**: Design documents from `specs/003-init-utils/`

**Prerequisites**: plan.md ✓ | spec.md ✓ | research.md ✓ | quickstart.md ✓

---

## Phase 1: Setup

**Purpose**: Register the new command alias so it is discoverable via npm.

- [x] T001 Add `"init-utils": "ts-node scripts/init-utils.ts"` to scripts in `package.json`

**Checkpoint**: `npm run init-utils -- --help` resolves (even before the script file exists, confirms alias wiring)

---

## Phase 2: User Story 1 — Copy to explicit path (Priority: P1) 🎯 MVP

**Goal**: `npx ts-node scripts/init-utils.ts <dest>` copies `utils.ts` to `<dest>/utils.ts`

**Independent Test**: `npm run init-utils -- ./tmp-test/` → file appears at `./tmp-test/utils.ts`, success + reminder lines printed

- [x] T002 [US1] Create `scripts/init-utils.ts` — parse `process.argv` for positional destination arg; resolve source path via `path.join(__dirname, '..', 'utils.ts')`
- [x] T003 [US1] Add source-not-found guard in `scripts/init-utils.ts` — print `Erreur : utils.ts introuvable : <path>` + `process.exit(1)`
- [x] T004 [US1] Add no-args guard in `scripts/init-utils.ts` — print usage line + `process.exit(1)` when neither positional arg nor `--auto`
- [x] T005 [US1] Add overwrite warning in `scripts/init-utils.ts` — `fs.existsSync(destFile)` → print `Attention : utils.ts existe déjà à <path>, le fichier sera écrasé.`
- [x] T006 [US1] Add copy logic in `scripts/init-utils.ts` — `fs.mkdirSync(dest, { recursive: true })` + `fs.copyFileSync(source, destFile)` + success + reminder messages

**Checkpoint**: US1 fully functional — test all 5 acceptance scenarios from spec.md

---

## Phase 3: User Story 2 — Auto-copy to cwd (Priority: P2)

**Goal**: `npx ts-node scripts/init-utils.ts --auto` copies `utils.ts` to `process.cwd()`

**Independent Test**: `cd /tmp/target && npm run --prefix /path/to/moulinette init-utils -- --auto` → `utils.ts` appears in `/tmp/target/`

- [x] T007 [US2] Add `--auto` flag parsing in `scripts/init-utils.ts` — detect flag in args, set `dest = process.cwd()` when no explicit path; explicit path takes precedence over `--auto` (FR-008)

**Checkpoint**: US1 + US2 both functional; run both test scenarios from quickstart.md

---

## Phase 4: Polish

- [x] T008 [P] Add `## Initialiser utils.ts dans un projet cible` section to `README.md` — show `npm run init-utils -- <destination>` and `npm run init-utils -- --auto` examples with post-copy configuration steps

---

## Dependencies & Execution Order

- **T001** first — confirms alias wiring before script is written
- **T002–T006** sequential — each builds on previous step in same file
- **T007** after T002–T006 — extends existing arg parsing
- **T008** can run any time after T001

### Parallel Opportunities

- T008 (README) can run in parallel with T002–T007 if desired

---

## Implementation Strategy

### MVP (US1 only)

1. T001 — add npm alias
2. T002–T006 — core copy with explicit path
3. Validate all US1 acceptance scenarios

### Full delivery

4. T007 — add --auto flag
5. T008 — README

---

## Notes

- No new dependencies — `fs` and `path` are Node.js built-ins
- `__dirname` in `scripts/init-utils.ts` resolves to `scripts/` → `path.join(__dirname, '..', 'utils.ts')` = project root `utils.ts`
- French messages for user-facing output (consistent with existing scripts)
