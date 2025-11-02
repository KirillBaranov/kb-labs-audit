# KB Labs Audit (@kb-labs/audit)

> **Unified quality audit framework for KB Labs monorepo packages.** Combines existing quality checks (eslint, tsc, vitest, build, devlink, mind, security) into a single orchestrator, producing machine-readable JSON reports and human-readable summaries (Markdown, Text, HTML) for CI/CD and release-manager integration.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-18.18.0+-green.svg)](https://nodejs.org/)
[![pnpm](https://img.shields.io/badge/pnpm-9.0.0+-orange.svg)](https://pnpm.io/)

## 🎯 Vision

KB Labs Audit provides a unified quality audit framework for KB Labs monorepo packages. It combines existing quality checks (eslint, tsc, vitest, build, devlink, mind, security) into a single orchestrator, producing machine-readable JSON reports and human-readable summaries for CI/CD and release-manager integration.

The project solves the problem of inconsistent quality checks across packages in a monorepo by providing a single command that runs all quality checks, aggregates results, and produces standardized reports. Instead of running multiple commands manually, developers can use `kb audit run` to get a comprehensive quality report.

This project is part of the **@kb-labs** ecosystem and integrates seamlessly with CI/CD pipelines, release manager, and all KB Labs development workflows.

## 🚀 Quick Start

### Installation

```bash
pnpm add -D @kb-labs/audit
# or
npm i -D @kb-labs/audit
```

### Development

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run tests
pnpm test

# Lint code
pnpm lint
```

### Basic Usage

#### Run Audit Checks

```bash
# Run all enabled checks at repo level
kb audit run

# Run checks for specific packages (per-package execution)
kb audit run --scope packages/*

# Run with JSON output
kb audit run --json

# Use specific devkit profile
kb audit run --profile frontend
```

#### View Results

```bash
# Show last report (human-readable)
kb audit show

# Show last report (JSON)
kb audit show --json

# List available checks
kb audit list-checks
```

#### Configuration

Create `kb-labs.config.json` to customize behavior:

```json
{
  "audit": {
    "enable": ["style", "types", "tests", "build"],
    "thresholds": {
      "coverage": {
        "lines": 90,
        "branches": 85,
        "functions": 90,
        "statements": 90
      }
    },
    "concurrency": 4
  }
}
```

## ✨ Features

- **Unified Quality Checks**: Run all quality checks (style, types, tests, build, devlink, mind, security) with a single command
- **Machine-Readable Reports**: JSON output for CI/CD pipelines and release-manager integration
- **Human-Readable Reports**: Markdown, Text, and HTML summaries
- **Parallel Execution**: Efficient parallel check execution with configurable concurrency (default: 4)
- **Configurable Thresholds**: Coverage thresholds from devkit profiles or local config
- **Graceful Degradation**: Missing tools are skipped gracefully
- **Proper Exit Codes**: Exit codes (0=pass, 2=quality gate fail, 3=misconfig)
- **Package Scope Filtering**: Run checks per package with glob patterns and aggregate results

## 📁 Repository Structure

```
kb-labs-audit/
├── apps/                    # Example applications
├── packages/                # Core packages
│   ├── audit-core/          # Core orchestrator, configuration, aggregation, and report generation
│   ├── audit-checks/        # Check adapters for eslint, tsc, vitest, build, devlink, mind, security
│   └── audit-cli/           # CLI commands and manifest integration
├── docs/                    # Documentation
│   └── adr/                 # Architecture Decision Records
└── scripts/                 # Utility scripts
```

### Directory Descriptions

- **`apps/`** - Example applications demonstrating audit usage
- **`packages/audit-core/`** - Core orchestrator with configuration, aggregation, and report generation
- **`packages/audit-checks/`** - Check adapters that normalize tool output
- **`packages/audit-cli/`** - CLI commands and manifest integration
- **`docs/`** - Documentation including ADRs and guides

## 📦 Packages

| Package | Description |
|---------|-------------|
| [@kb-labs/audit-core](./packages/audit-core/) | Core orchestrator, configuration, aggregation, and report generation |
| [@kb-labs/audit-checks](./packages/audit-checks/) | Check adapters for eslint, tsc, vitest, build, devlink, mind, security |
| [@kb-labs/audit-cli](./packages/audit-cli/) | CLI commands and manifest integration |

### Package Details

**@kb-labs/audit-core** provides the core orchestrator:
- Configuration loading and merging (config → profile → defaults)
- Package scope discovery and filtering
- Check execution with parallel processing
- Result aggregation and threshold validation
- Report generation (JSON, Markdown, Text, HTML)

**@kb-labs/audit-checks** provides check adapters:
- **Style Check (ESLint)**: Runs `eslint .`, captures errors and warnings
- **Types Check (TypeScript)**: Runs `tsc --noEmit`, captures type errors
- **Tests Check (Vitest)**: Runs `vitest run`, validates coverage thresholds
- **Build Check**: Auto-detects build tool (tsup/rollup/vite), measures success
- **DevLink Check**: Runs `kb devlink status --json`, validates linking state
- **Mind Check**: Runs `kb mind pack --json`, validates context layer
- **Security Check**: Runs `npm audit --json`, captures vulnerabilities

**@kb-labs/audit-cli** provides CLI commands:
- `kb audit run` - Run quality audit checks
- `kb audit show` - Display last audit report
- `kb audit list-checks` - List available checks
- `kb audit clean` - Clean output directory

## 🛠️ Available Scripts

| Script | Description |
|--------|-------------|
| `pnpm dev` | Start development mode for all packages |
| `pnpm build` | Build all packages |
| `pnpm build:clean` | Clean and build all packages |
| `pnpm test` | Run all tests |
| `pnpm test:coverage` | Run tests with coverage reporting |
| `pnpm test:watch` | Run tests in watch mode |
| `pnpm lint` | Lint all code |
| `pnpm lint:fix` | Fix linting issues |
| `pnpm format` | Format code with Prettier |
| `pnpm type-check` | TypeScript type checking |
| `pnpm check` | Run lint, type-check, and tests |
| `pnpm ci` | Full CI pipeline (clean, build, check) |
| `pnpm clean` | Clean build artifacts |
| `pnpm clean:all` | Clean all node_modules and build artifacts |

## 📋 Development Policies

- **Code Style**: ESLint + Prettier, TypeScript strict mode
- **Testing**: Vitest with comprehensive test coverage
- **Versioning**: SemVer with automated releases through Changesets
- **Architecture**: Document decisions in ADRs (see `docs/adr/`)
- **Design Principles**: Deterministic, composable, isolated, observable, safe, fast

## 🔧 Requirements

- **Node.js**: >= 18.18.0
- **pnpm**: >= 9.0.0

## ⚙️ Configuration

Configure audit behavior via `kb-labs.config.json`:

```json
{
  "audit": {
    "enable": ["style", "types", "tests", "build", "devlink", "mind", "security"],
    "thresholds": {
      "coverage": {
        "lines": 90,
        "branches": 85,
        "functions": 90,
        "statements": 90
      }
    },
    "timeouts": {
      "styleMs": 30000,
      "typesMs": 60000,
      "testsMs": 300000,
      "buildMs": 180000,
      "devlinkMs": 10000,
      "mindMs": 10000,
      "securityMs": 60000
    },
    "scope": {
      "include": ["packages/*"],
      "exclude": ["packages/internal/*"]
    },
    "output": {
      "json": true,
      "md": true,
      "html": false,
      "text": true
    },
    "concurrency": 4
  }
}
```

### Configuration Priority

1. `kb-labs.config.json#audit` (highest priority)
2. Devkit profile thresholds
3. Default values

### Coverage Thresholds

Coverage thresholds come from:
1. `kb-labs.config.json#audit.thresholds.coverage`
2. Devkit profile (e.g., `frontend`, `library`)
3. Defaults (lines: 80, branches: 75, functions: 80, statements: 80)

### Build Check

The build check automatically detects build tools:
- **tsup**: Detects `tsup.config.ts` or `tsup.config.js`
- **rollup**: Detects `rollup.config.js`
- **vite**: Detects `vite.config.ts` or `vite.config.js`
- **fallback**: Runs `pnpm build` if no tool is detected

Build check measures:
- Build success (exit code)
- Artifact size (if available)
- Errors are logged but don't halt audit (unless `--strict`)

## 🏗️ Architecture

### Architecture Flow

```
┌──────────────────────┐
│   config phase      │
│  load config        │
│  resolve profile    │
│  merge overrides    │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│   scope phase        │
│  discover packages   │
│  apply glob filters  │
│  filter private      │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│   check phase       │
│  run adapters       │
│  parallel execution  │
│  timeout handling   │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│  aggregate phase    │
│  merge results      │
│  apply thresholds   │
│  compute overall    │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│   report phase      │
│  generate JSON      │
│  generate MD/TXT   │
│  generate HTML      │
└──────────────────────┘
```

### Design Principles

- **Deterministic**: Reproducible reports across runs
- **Composable**: CLI is a thin wrapper; all logic in packages
- **Isolated**: Each check runs independently
- **Observable**: Everything produces explicit reports
- **Safe**: Graceful degradation for missing tools
- **Fast**: Parallel execution with configurable concurrency

## 📊 Output

Audit reports are written to `.kb/audit/`:

```
.kb/audit/
├── report.json    # Machine-readable JSON report
├── summary.md     # Human-readable Markdown summary
├── summary.txt    # CI-friendly text summary
└── summary.html   # HTML dashboard (optional)
```

### Report Schema

JSON reports follow a stable schema:

```json
{
  "schemaVersion": "1.0",
  "ts": "2025-01-28T12:00:00Z",
  "context": {
    "repo": "/path/to/repo",
    "cwd": "/path/to/cwd",
    "profile": "frontend"
  },
  "checks": {
    "style": {
      "id": "style",
      "ok": true,
      "details": {},
      "timingMs": 1234
    },
    "types": {
      "id": "types",
      "ok": true,
      "details": {},
      "timingMs": 2345
    }
  },
  "overall": {
    "ok": true,
    "failReasons": []
  },
  "meta": {
    "node": "v20.19.4",
    "kbCli": "1.2.3",
    "pnpm": "9.11.0",
    "timingMs": {
      "total": 5678
    }
  }
}
```

### Exit Codes

| Code | Description |
|------|-------------|
| 0 | All checks passed |
| 1 | Infrastructure/tool error (unexpected failure) |
| 2 | Quality gate failed (expected fail) |
| 3 | Misconfiguration (invalid config or flags) |

## 💡 Use Cases

- **CI/CD Integration**: Run audits in CI pipelines with JSON output
- **Release Workflow**: Validate quality before releases
- **Package Validation**: Check specific packages with `--scope`
- **Quality Monitoring**: Track quality metrics over time
- **Team Standards**: Enforce consistent thresholds across packages
- **Development Workflow**: Quick quality check during development

## 📚 Documentation

- [Documentation Standard](./docs/DOCUMENTATION.md) - Full documentation guidelines
- [Contributing Guide](./CONTRIBUTING.md) - How to contribute
- [Architecture Decisions](./docs/adr/) - ADRs for this project

**Package READMEs:** See individual package directories for detailed API documentation

## 🔗 Related Packages

### Dependencies

- [@kb-labs/core](https://github.com/KirillBaranov/kb-labs-core) - Core utilities
- [@kb-labs/devkit](https://github.com/KirillBaranov/kb-labs-devkit) - DevKit profiles

### Used By

- All KB Labs projects for quality checking
- CI/CD pipelines
- [@kb-labs/release-manager](https://github.com/KirillBaranov/kb-labs-release-manager) - Release orchestration

### Ecosystem

- [KB Labs](https://github.com/KirillBaranov/kb-labs) - Main ecosystem repository

## ❓ FAQ

### General

- **Why use Audit instead of running checks manually?** — Audit provides unified reporting, parallel execution, and CI/CD integration with a single command.
- **Can I customize check behavior?** — Yes, via `kb-labs.config.json` and devkit profiles.
- **What happens if a tool is missing?** — Missing tools are skipped gracefully with a warning.
- **Can I run checks in parallel?** — Yes, default concurrency is 4, configurable via `concurrency` option.

### Configuration

- **How do I set coverage thresholds?** — Use `kb-labs.config.json#audit.thresholds.coverage` or devkit profiles.
- **Can I disable specific checks?** — Yes, via `kb-labs.config.json#audit.enable` array.
- **How do I configure timeouts?** — Use `kb-labs.config.json#audit.timeouts`.
- **What's the configuration priority?** — Local config > devkit profile > defaults.

### Package Scope

- **How does `--scope` work?** — It filters packages using glob patterns and runs checks per package, then aggregates results.
- **What if no `--scope` is provided?** — Audit runs at repo level (all packages in workspace).
- **Can I exclude private packages?** — Yes, by default private packages are excluded unless `--all` is used.
- **How do glob patterns work?** — Uses `globby` to match package directories.

### Reporting

- **Where are reports saved?** — `.kb/audit/` directory in repo root.
- **Can I customize report formats?** — Yes, via `kb-labs.config.json#audit.output`.
- **What's the JSON schema?** — See [Output](#-output) section above.
- **Can I use reports in CI/CD?** — Yes, JSON reports are stable and machine-readable.

## 🤝 Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for development guidelines and contribution process.

## 📄 License

MIT © KB Labs

---

**See [CONTRIBUTING.md](./CONTRIBUTING.md) for development guidelines and contribution process.**
