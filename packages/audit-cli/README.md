# @kb-labs/audit-cli

KB Labs Audit - CLI commands for running quality audits.

## Vision & Purpose

**@kb-labs/audit-cli** provides CLI commands for KB Labs Audit. It includes commands for running audits, listing checks, showing reports, and cleaning audit artifacts.

### Core Goals

- **Run Command**: Execute audit checks
- **List Checks**: List available checks
- **Show Command**: Show audit reports
- **Clean Command**: Clean audit artifacts

## Package Status

- **Version**: 0.1.0
- **Stage**: Stable
- **Status**: Production Ready ✅

## Architecture

### High-Level Overview

```
Audit CLI
    │
    ├──► CLI Commands
    ├──► Manifest Definition
    ├──► REST Handlers
    └──► Analytics Integration
```

### Key Components

1. **Commands** (`commands/`): CLI command implementations
2. **Manifest** (`manifest.v2.ts`): Plugin manifest definition
3. **REST Handlers** (`rest/handlers/`): REST API handlers
4. **Analytics** (`analytics/`): Analytics event tracking

## ✨ Features

- **Run command** for executing audits
- **List checks command** for listing available checks
- **Show command** for displaying reports
- **Clean command** for cleaning artifacts
- **REST handlers** for API integration
- **Analytics integration** for event tracking
- **Scope filtering** for package selection

## 📦 API Reference

### Main Exports

#### Commands

- `run`: Run audit command
- `list-checks`: List checks command
- `show`: Show report command
- `clean`: Clean artifacts command

#### Manifest

- `manifest`: Plugin manifest V2
- `commands`: CLI commands manifest

#### Utilities

- `getWorkspacePackages()`: Get workspace packages
- `filterPackagesByScope()`: Filter packages by scope

## 🔧 Configuration

### Configuration Options

All configuration via CLI flags and kb-labs.config.json.

### CLI Flags

- `--json`: Output JSON format
- `--quiet`: Quiet mode
- `--dry-run`: Dry run mode
- `--scope`: Package scope pattern
- `--all`: Include private packages
- `--verbose`: Verbose output

## 🔗 Dependencies

### Runtime Dependencies

- `@kb-labs/analytics-sdk-node` (`link:../../../kb-labs-analytics/packages/analytics-sdk-node`): Analytics SDK
- `@kb-labs/audit-core` (`link:../audit-core`): Audit core
- `@kb-labs/audit-checks` (`link:../audit-checks`): Audit checks
- `@kb-labs/audit-contracts` (`link:../audit-contracts`): Audit contracts
- `@kb-labs/cli-core` (`link:../../../kb-labs-cli/packages/core`): CLI core
- `@kb-labs/cli-commands` (`link:../../../kb-labs-cli/packages/commands`): CLI commands
- `@kb-labs/core` (`link:../../../kb-labs-core`): Core package
- `@kb-labs/plugin-manifest` (`link:../../../kb-labs-plugin/packages/manifest`): Plugin manifest
- `@kb-labs/shared-cli-ui` (`link:../../../kb-labs-shared/packages/cli-ui`): Shared CLI UI
- `execa` (`^8.0.0`): Process execution
- `globby` (`^11.0.0`): File pattern matching
- `yaml` (`^2.8.0`): YAML parsing

### Development Dependencies

- `@kb-labs/devkit` (`link:../../../kb-labs-devkit`): DevKit presets
- `@types/node` (`^24.7.0`): Node.js types
- `tsup` (`^8`): TypeScript bundler
- `typescript` (`^5`): TypeScript compiler
- `vitest` (`^3`): Test runner

## 🧪 Testing

### Test Structure

```
src/__tests__/
└── cli.manifest.spec.ts
```

### Test Coverage

- **Current Coverage**: ~50%
- **Target Coverage**: 90%

## 📈 Performance

### Performance Characteristics

- **Time Complexity**: O(n) for command execution, O(1) for command registration
- **Space Complexity**: O(n) where n = number of packages
- **Bottlenecks**: Audit execution time

## 🔒 Security

### Security Considerations

- **Scope Validation**: Package scope validation
- **Path Validation**: Path validation for file operations

### Known Vulnerabilities

- None

## 🐛 Known Issues & Limitations

### Known Issues

- None currently

### Limitations

- **Command Types**: Fixed command types
- **Output Formats**: Fixed output formats

### Future Improvements

- **More Commands**: Additional commands
- **Custom Output Formats**: Custom output format support

## 🔄 Migration & Breaking Changes

### Migration from Previous Versions

No breaking changes in current version (0.1.0).

### Breaking Changes in Future Versions

- None planned

## 📚 Examples

### Example 1: Run Audit

```bash
kb audit:run
```

### Example 2: Run Audit with Scope

```bash
kb audit:run --scope "@kb-labs/core-*"
```

### Example 3: List Checks

```bash
kb audit:list-checks
```

### Example 4: Show Report

```bash
kb audit:show
```

## 🤝 Contributing

See [CONTRIBUTING.md](../../CONTRIBUTING.md) for development guidelines.

## 📄 License

MIT © KB Labs

