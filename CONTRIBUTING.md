# Contributing to @kb-labs/audit

Thank you for helping improve `@kb-labs/audit`! This guide explains how to set up your environment, propose changes, and work with our CI and release flows.

## Principles

- **Automation first**: prefer codified, repeatable processes.
- **Consistency over variety**: align with existing conventions and KB Labs ecosystem.
- **Small, focused changes**: easier to review and ship.
- **User experience matters**: Audit is a developer tool — make it reliable and fast.

## Getting started

### Prerequisites

- Node.js 20+
- pnpm 9+
- Git

### Install

```bash
pnpm i
```

### Useful scripts

```bash
pnpm build         # build all packages
pnpm dev           # watch mode for all packages
pnpm lint          # run ESLint
pnpm lint:fix      # run ESLint with auto-fix
pnpm test          # run Vitest tests
pnpm test:coverage # run tests with coverage
pnpm test:watch    # run tests in watch mode
pnpm type-check    # run TypeScript type checking
pnpm format        # format with Prettier
pnpm format:check  # check formatting
pnpm check         # run lint + type-check + tests
pnpm ci            # full CI pipeline (clean + build + check)
pnpm clean         # remove build artifacts
pnpm clean:all      # remove node_modules and build artifacts
```

## Project structure

```
kb-labs-audit/
├── packages/
│   ├── audit-core/              # @kb-labs/audit-core
│   │   ├── src/
│   │   │   ├── config.ts        # Configuration loader
│   │   │   ├── runner.ts       # Main audit runner
│   │   │   ├── aggregator.ts   # Result aggregation
│   │   │   ├── check-registry.ts # Check adapter registry
│   │   │   ├── types.ts         # Core type definitions
│   │   │   └── reporters/       # Report generators (JSON, MD, TXT, HTML)
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── tsup.config.ts
│   │   └── vitest.config.ts
│   ├── audit-checks/            # @kb-labs/audit-checks
│   │   ├── src/
│   │   │   ├── base.ts         # Base adapter class
│   │   │   ├── style.ts        # ESLint adapter
│   │   │   ├── types.ts        # TypeScript adapter
│   │   │   ├── tests.ts        # Vitest adapter
│   │   │   ├── build.ts        # Build adapter
│   │   │   ├── devlink.ts      # DevLink adapter
│   │   │   ├── mind.ts         # Mind adapter
│   │   │   └── security.ts     # Security adapter
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── tsup.config.ts
│   │   └── vitest.config.ts
│   └── audit-cli/              # @kb-labs/audit-cli
│       ├── src/
│       │   ├── commands/       # CLI command handlers
│       │   │   ├── run.ts      # audit:run command
│       │   │   ├── list-checks.ts
│       │   │   ├── show.ts
│       │   │   └── clean.ts
│       │   ├── cli.manifest.ts # CLI manifest registration
│       │   ├── package-scope.ts # Package scope utilities
│       │   └── utils.ts         # Helper utilities
│       ├── package.json
│       ├── tsconfig.json
│       ├── tsup.config.ts
│       └── vitest.config.ts
├── docs/
│   └── adr/                     # Architecture Decision Records (if any)
├── .github/
│   └── workflows/               # CI/CD workflows
└── .kb/
    └── devkit/
        └── agents/              # AI agent definitions (synced from DevKit)
├── README.md
├── CONTRIBUTING.md
├── package.json
├── tsconfig.json
├── eslint.config.js
├── prettierrc.json
└── vitest.config.ts
```

## Development workflow

### 1. Create a feature branch

```bash
git checkout -b feat/my-feature
# or
git checkout -b fix/bug-description
# or
git checkout -b chore/task-description
```

### 2. Make your changes

- Keep changes focused and atomic
- Write tests for new functionality
- Update documentation as needed
- Follow existing code patterns

### 3. Test locally

```bash
# Run the full check suite
pnpm check

# Or run individual checks
pnpm lint
pnpm type-check
pnpm test
```

### 4. Commit your changes

Use conventional commit messages:

```bash
git commit -m "feat: add new check adapter"
git commit -m "fix: resolve timeout handling bug"
git commit -m "docs: update CLI usage examples"
git commit -m "chore: update dependencies"
```

Commit types:

- `feat:` — new features
- `fix:` — bug fixes
- `docs:` — documentation changes
- `refactor:` — code refactoring
- `test:` — test additions or changes
- `chore:` — maintenance tasks
- `perf:` — performance improvements

### 5. Open a pull request

- Keep PRs focused (ideally < 300 lines)
- Include a clear description of what and why
- Link related issues if they exist
- Ensure CI passes

## Core Package Development

### Working on @kb-labs/audit-core

The core package contains the orchestrator, configuration loader, and report generators. When adding features:

1. **Add types first** in `src/types.ts`
2. **Implement logic** in the appropriate module (`config.ts`, `runner.ts`, `aggregator.ts`, etc.)
3. **Export from index** via `src/index.ts`
4. **Write tests** alongside your implementation
5. **Update documentation** in README and JSDoc comments

### Working on @kb-labs/audit-checks

The checks package contains adapters for external tools. When adding a new check:

1. **Extend BaseCheck** in `src/base.ts`
2. **Implement `run()` method** with timeout handling
3. **Normalize output** to `AuditCheckResult` format
4. **Export from index** via `src/index.ts`
5. **Register in check-registry** in `audit-core`
6. **Write tests** for the adapter
7. **Update documentation** with check details

Example adapter:

```ts
import { BaseCheck, type AuditCheckResult } from '@kb-labs/audit-core';
import { execa } from 'execa';

export class StyleCheck extends BaseCheck {
  id = 'style' as const;

  async run(cwd: string, timeoutMs: number): Promise<AuditCheckResult> {
    try {
      const { stdout, exitCode } = await execa(
        'eslint',
        ['.'],
        {
          cwd,
          timeout: timeoutMs,
          reject: false,
        }
      );

      return {
        id: this.id,
        ok: exitCode === 0,
        details: {
          exitCode,
          output: stdout,
        },
        timingMs: 0, // TODO: measure timing
      };
    } catch (error) {
      return {
        id: this.id,
        ok: false,
        code: 'TOOL_ERROR',
        details: {
          error: error instanceof Error ? error.message : String(error),
        },
      };
    }
  }
}
```

### Working on @kb-labs/audit-cli

The CLI package contains command handlers and manifest registration. When adding a command:

1. **Define command** in `src/commands/<command>.ts`
2. **Register in manifest** via `src/cli.manifest.ts`
3. **Export from index** via `src/index.ts`
4. **Write tests** for the command
5. **Update documentation** in README

### Module guidelines

Each module should:

- Export a clear, focused API
- Include comprehensive JSDoc comments
- Have corresponding tests
- Follow functional programming principles where possible
- Avoid side effects (except in I/O operations)

## Testing

### Test structure

Tests are colocated with source files:

```
src/
├── config.ts
├── config.test.ts
├── runner.ts
└── runner.test.ts
```

### Writing tests

- **Unit tests**: Test individual functions in isolation
- **Integration tests**: Test module interactions
- **E2E tests**: Test complete workflows

Example test:

```ts
import { describe, it, expect } from 'vitest';
import { loadConfig } from './config';

describe('loadConfig', () => {
  it('should load config from kb-labs.config.json', async () => {
    const config = await loadConfig({
      cwd: './fixtures/project-with-config',
    });
    expect(config.enable).toContain('style');
  });

  it('should use defaults when no config found', async () => {
    const config = await loadConfig({
      cwd: './fixtures/project-without-config',
    });
    expect(config.enable).toEqual(['style', 'types', 'tests', 'build']);
  });
});
```

### Running tests

```bash
# All tests
pnpm test

# Watch mode
pnpm test:watch

# Coverage
pnpm test:coverage

# Specific file
pnpm test config.test.ts
```

## DevKit Integration

This project uses `@kb-labs/devkit` for shared tooling configurations. Key points:

- **Configurations**: ESLint, Prettier, Vitest, TypeScript, and GitHub Actions are managed by DevKit
- **Local configs**: Act as thin wrappers over DevKit configurations
- **Updates**: When DevKit is updated, run `pnpm install` to get the latest configurations
- **Customization**: For project-specific rules, extend DevKit configs rather than overriding them

### DevKit Commands

```bash
pnpm devkit:sync    # Sync DevKit configurations (runs automatically on install)
pnpm devkit:check   # Check if sync is needed
pnpm devkit:force   # Force sync (overwrites existing configs)
pnpm devkit:help    # Show help and available options
```

### Synced Assets

The following assets are synced from DevKit:

- **AI Agents** → `.kb/devkit/agents/` — Standardized AI agent definitions (synced from DevKit)
- **Cursor Rules** → `.cursorrules` — Cursor IDE configuration
- **VS Code Settings** → `.vscode/settings.json` — Editor configuration (optional)

To update agents after DevKit changes:

```bash
pnpm devkit:sync
```

## AI Agents

This project includes standardized AI agents synced from DevKit. Each agent is defined in the `.kb/devkit/agents/` directory:

- **DevKit Maintainer** — Enforces unified tooling and DevKit standards
- **Test Generator** — Generates and maintains unit tests
- **Docs Drafter** — Drafts and updates documentation
- **Release Manager** — Manages releases and changelogs

When contributing to Audit:

- Use agents to accelerate development
- Agents are synced from DevKit via `pnpm devkit:sync`
- Product-specific agents can be added to `.kb/<product>/agents/` if needed

> **Note:** `.kb` is the common ecosystem folder. `devkit` is the product namespace. Each product decides what to store in their namespace.

## Architecture Decision Records (ADR)

For significant architectural decisions, create an ADR:

1. Copy the template: `cp docs/adr/0000-template.md docs/adr/NNNN-my-decision.md`
2. Fill in the sections: Context, Decision, Consequences
3. Number sequentially (e.g., `0001`, `0002`, etc.)
4. Include in your PR

ADRs help document the "why" behind design choices and provide context for future contributors.

### Architecture Decision Requirements

- For significant architectural changes, add an ADR in `docs/adr/`
- Follow the ADR template in `docs/adr/0000-template.md`
- Include required metadata (Date, Status, Deciders, **Last Reviewed**, **Tags**)
- **Last Reviewed** date is required and should be updated periodically
- **Tags** are mandatory (minimum 1, maximum 5 tags from approved list)
- See [Documentation Standard](./docs/DOCUMENTATION.md) for ADR format requirements

## Branching model

- `main` is the default branch
- Use short-lived feature branches: `feat/<scope>`, `fix/<scope>`, `chore/<scope>`
- Keep branches focused on a single concern
- Rebase before merging to keep history clean

## Pull requests

### Before opening a PR

- [ ] Run `pnpm check` locally
- [ ] Update relevant documentation
- [ ] Add/update tests for new functionality
- [ ] Write clear commit messages
- [ ] Ensure no linter errors

### PR guidelines

- Keep PRs focused and under ~300 lines where possible
- Include a brief summary of what and why
- Link related issues if they exist
- Use the PR template if provided
- Respond to review feedback promptly

### PR review process

1. Automated CI checks run (lint, type-check, tests, build)
2. Maintainers review code and provide feedback
3. Address feedback and update PR
4. Once approved, PR is merged to `main`

## CI/CD

This project uses GitHub Actions for CI/CD:

- **Pull Request**: Runs lint, type-check, tests, and build
- **Main branch**: Runs full CI pipeline
- **Releases**: Automated via tags (e.g., `v0.1.0`)

### CI Workflow

```yaml
jobs:
  ci:
    runs-on: ubuntu-latest
    steps:
      - Checkout
      - Setup Node + pnpm
      - Install dependencies
      - Lint (ESLint)
      - Type-check (TypeScript)
      - Test (Vitest)
      - Build (tsup)
```

### Release Process

1. Update version in `package.json`
2. Update `CHANGELOG.md` (if exists)
3. Create and push a tag: `git tag v0.1.0 && git push origin v0.1.0`
4. GitHub Actions creates a release and publishes to npm (if configured)

## Code style

- **ESM-first**: All code uses ES modules
- **Node 20 baseline**: Target Node.js 20+ features
- **TypeScript**: Strict mode enabled
- **Functional style**: Prefer pure functions and immutability
- **Explicit over clever**: Readable code > concise code

### Style rules (enforced by ESLint/Prettier)

- No semicolons
- Single quotes
- 100 character line width
- 2-space indentation
- Trailing commas in multiline

### Naming conventions

- **Files**: kebab-case (`config.ts`, `check-registry.ts`)
- **Functions**: camelCase (`loadConfig`, `runAudit`)
- **Types**: PascalCase (`AuditConfig`, `AuditCheckResult`)
- **Constants**: UPPER_SNAKE_CASE (`MAX_CONCURRENCY`, `DEFAULT_TIMEOUT`)

## Performance considerations

Audit needs to handle large monorepos efficiently:

- **Parallel execution**: Use `Promise.allSettled` for independent checks
- **Timeout handling**: Enforce timeouts for long-running checks
- **Lazy loading**: Load adapters dynamically to avoid circular dependencies
- **Minimize I/O**: Cache file system reads where possible
- **Memory management**: Stream large files instead of loading into memory
- **Benchmark**: Measure performance of critical paths

## Security

- Do not commit secrets or tokens
- Use GitHub Environments/Secrets for sensitive data
- Report vulnerabilities privately to the maintainers
- Validate user input in CLI commands
- Sanitize file paths to prevent directory traversal
- Handle tool errors gracefully (don't expose sensitive info)

## Documentation

Keep documentation up to date:

- **README.md**: User-facing documentation and quick start
- **CONTRIBUTING.md**: This file — contributor guidelines
- **ADRs**: Architectural decision records for significant choices
- **JSDoc**: Inline documentation for all exported functions
- **Examples**: Practical examples in README and tests

### Documentation style

- Use clear, concise language
- Include code examples
- Explain the "why" not just the "what"
- Keep examples up to date with code changes
- Use diagrams for complex concepts

## Governance

- Maintainers have final review authority
- Breaking changes require:
  - Clear migration notes in README and CHANGELOG
  - Version bump (major version for breaking changes)
  - Deprecation warnings in previous version (if possible)
- Feature decisions consider:
  - User needs and feedback
  - Alignment with KB Labs ecosystem
  - Maintenance burden
  - Performance impact

## Getting help

- **Questions?** Open a GitHub Discussion
- **Bugs?** Open a GitHub Issue
- **Ideas?** Open a GitHub Discussion or Issue
- **PRs?** Always welcome!

## Questions

Open a GitHub Discussion or issue. PRs welcome!

---

**See [Documentation Standard](./docs/DOCUMENTATION.md) for complete documentation guidelines.**
