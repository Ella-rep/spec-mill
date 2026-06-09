# Feature Specification: Init Utils Command

**Feature Branch**: `003-init-utils`

**Created**: 2026-06-09

**Status**: Draft

**Input**: User description: "add a CLI command (init-utils) that copies utils.ts to a destination path chosen by the user. Add --auto flag. Document in README."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Copy utils.ts to specified path (Priority: P1)

A developer who just generated a spec file needs `utils.ts` in their Playwright project. They run the init-utils command with the path to their project and the file is copied there, ready to configure.

**Why this priority**: The manual copy step is the single biggest friction point after generating a spec. Without `utils.ts` in the right place the generated spec cannot run at all. This story eliminates that friction.

**Independent Test**: Run `npx ts-node scripts/init-utils.ts ./target/` and verify `utils.ts` appears at `./target/utils.ts`. Can be tested without `--auto` flag.

**Acceptance Scenarios**:

1. **Given** a developer provides a valid destination directory path, **When** they run the init-utils command, **Then** `utils.ts` is copied to that directory and a success message is printed showing the full destination path and a reminder to configure the URL and credentials
2. **Given** the destination directory does not exist, **When** they run the init-utils command, **Then** the directory is created and `utils.ts` is copied into it
3. **Given** a `utils.ts` file already exists at the destination, **When** they run the init-utils command, **Then** a warning is shown and the file is overwritten
4. **Given** no destination argument is provided and `--auto` is not set, **When** they run the init-utils command, **Then** an error message shows the correct usage syntax
5. **Given** the source `utils.ts` is missing from the tool root, **When** they run the init-utils command, **Then** an error message explains that `utils.ts` was not found and where it is expected

---

### User Story 2 - Auto-copy to current working directory (Priority: P2)

A developer wants to initialise a new Playwright project quickly without specifying a path. They run init-utils with the `--auto` flag and `utils.ts` is copied to their current working directory.

**Why this priority**: The `--auto` flag eliminates the last remaining manual step for users who are already in their target project directory. It is a convenience enhancement on top of the core copy feature.

**Independent Test**: Change to a target directory, run `npx ts-node /path/to/scripts/init-utils.ts --auto`, verify `utils.ts` appears in that directory.

**Acceptance Scenarios**:

1. **Given** a developer is in their target project directory and runs the command with `--auto`, **When** the command executes, **Then** `utils.ts` is copied to the current working directory with a success message
2. **Given** both a destination path and `--auto` are provided, **When** the command executes, **Then** the explicit destination path takes precedence over `--auto`

---

### Edge Cases

- What happens when the destination path has no write permission?
- What happens when the source `utils.ts` is empty or corrupted?
- What happens when `--auto` is used from the project root (would overwrite the source)?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The command MUST accept a destination directory path as a positional argument and copy `utils.ts` into that directory
- **FR-002**: The command MUST support a `--auto` flag that uses the current working directory as the destination when no explicit path is given
- **FR-003**: The command MUST create the destination directory if it does not exist
- **FR-004**: The command MUST print a warning when overwriting an existing `utils.ts` at the destination, then proceed with the copy
- **FR-005**: The command MUST print a success message on completion showing the full path of the copied file and a reminder to update the site URL and credentials
- **FR-006**: The command MUST print a usage error and exit if neither a destination path nor `--auto` is provided
- **FR-007**: The command MUST print an error and exit if the source `utils.ts` cannot be found at the expected location relative to the script
- **FR-008**: When both a destination path and `--auto` are provided, the explicit destination path MUST take precedence
- **FR-009**: The README MUST document the `init-utils` command with examples for both explicit-path usage and `--auto` usage in the setup prerequisites section

### Key Entities

- **Source file**: `utils.ts` located at the project root of the playwright-moulinette tool
- **Destination**: The directory path provided by the user (explicit argument or `--auto` = current working directory)

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A developer can set up `utils.ts` in their target project in under 30 seconds using the init-utils command
- **SC-002**: Zero manual file navigation is required when using `--auto` from the target project directory
- **SC-003**: Every error scenario produces a message that tells the developer exactly what went wrong and what to do next, with no need to consult external documentation

## Assumptions

- `utils.ts` lives at the root of the playwright-moulinette tool directory (same level as `scripts/`, `package.json`)
- The command is run via `npx ts-node scripts/init-utils.ts` from the playwright-moulinette tool directory, or via an `npm run` alias
- The developer is responsible for editing the copied `utils.ts` to configure site URL and credentials — the command only copies, it does not configure
- `--auto` resolves to `process.cwd()` at runtime, which is the directory from which the command is invoked
- Overwriting an existing `utils.ts` is always permitted after a warning — no interactive prompt is required
