# Research: Init Utils Command

**Branch**: `003-init-utils` | **Date**: 2026-06-09

## Decision Log

### D-001: Source file resolution

**Decision**: Resolve `utils.ts` relative to the script file using `path.join(__dirname, '..', 'utils.ts')`. This resolves to the project root regardless of where the developer invokes the command from.

**Rationale**: `__dirname` in `scripts/init-utils.ts` always points to the `scripts/` directory. Going one level up (`..`) reliably reaches the project root where `utils.ts` lives, independent of `process.cwd()`.

**Alternatives considered**:
- `process.cwd()` + `utils.ts`: Breaks if developer is not in the project root when running the command
- Hardcoded absolute path: Non-portable across machines

---

### D-002: `--auto` flag implementation

**Decision**: `--auto` sets destination to `process.cwd()` (the directory from which the command is invoked). Explicit positional argument always takes precedence over `--auto`.

**Rationale**: `process.cwd()` is the intuitive target — the developer is already in their target project directory when they run the command. Explicit-over-auto precedence matches standard CLI conventions (e.g., git, npm).

**Alternatives considered**:
- Auto-detect from last generated spec path: Too brittle (depends on output file naming conventions)
- Prompt user interactively: Adds friction, breaks non-interactive pipelines

---

### D-003: Argument parsing

**Decision**: Manual `process.argv` parsing — no argument parsing library. Two tokens to detect: presence of `--auto` flag and any non-flag argument as the destination path.

**Rationale**: The argument surface is minimal (one flag, one optional positional). Adding a library (e.g., `yargs`, `commander`) for two arguments violates the zero-new-dependencies constraint from Feature 001.

---

### D-004: Directory creation

**Decision**: `fs.mkdirSync(dest, { recursive: true })` before copy. Silent success if directory already exists.

**Rationale**: Matches Feature 001/002 pattern of creating output directories silently. Matches Node.js standard practice for CLI tools.

---

### D-005: Overwrite behavior

**Decision**: Warn to console then overwrite unconditionally. No interactive prompt.

**Rationale**: Per FR-004 — a prompt would block non-interactive use. The warning is sufficient for developers who run the command intentionally.

---

### D-006: npm script alias

**Decision**: Add `"init-utils": "ts-node scripts/init-utils.ts"` to `package.json` `scripts`. Invocable as `npm run init-utils -- <dest>` or `npx ts-node scripts/init-utils.ts <dest>`.

**Rationale**: Consistent with existing `csv-to-spec` and `codegen-to-spec` aliases. Reduces friction for new users.
