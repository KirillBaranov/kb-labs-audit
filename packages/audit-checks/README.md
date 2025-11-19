# @kb-labs/audit-checks

KB Labs Audit - check adapters for eslint, tsc, vitest, build, devlink, mind, and security.

## Vision & Purpose

**@kb-labs/audit-checks** provides check adapters for KB Labs Audit. It includes adapters for style checks (ESLint), type checks (TypeScript), test checks (Vitest), build checks, devlink checks, mind checks, and security checks.

### Core Goals

- **Check Adapters**: Adapters for various quality checks
- **Base Adapter**: Base class for implementing custom checks
- **Check Execution**: Execute checks with timeout handling

## Package Status

- **Version**: 0.1.0
- **Stage**: Stable
- **Status**: Production Ready ✅

## Architecture

### High-Level Overview

```
Audit Checks
    │
    ├──► Base Adapter
    ├──► Style Check (ESLint)
    ├──► Types Check (TypeScript)
    ├──► Tests Check (Vitest)
    ├──► Build Check
    ├──► DevLink Check
    ├──► Mind Check
    └──► Security Check
```

### Key Components

1. **BaseCheckAdapter** (`base.ts`): Base class for check adapters
2. **StyleCheck** (`style.ts`): ESLint style checking
3. **TypesCheck** (`types.ts`): TypeScript type checking
4. **TestsCheck** (`tests.ts`): Vitest test checking
5. **BuildCheck** (`build.ts`): Build checking
6. **DevLinkCheck** (`devlink.ts`): DevLink checking
7. **MindCheck** (`mind.ts`): Mind checking
8. **SecurityCheck** (`security.ts`): Security checking

## ✨ Features

- **Base adapter** for custom checks
- **Style checking** via ESLint
- **Type checking** via TypeScript
- **Test checking** via Vitest
- **Build checking**
- **DevLink checking**
- **Mind checking**
- **Security checking**

## 📦 API Reference

### Main Exports

#### Check Adapters

- `BaseCheckAdapter`: Base class for check adapters
- `StyleCheck`: ESLint style check adapter
- `TypesCheck`: TypeScript type check adapter
- `TestsCheck`: Vitest test check adapter
- `BuildCheck`: Build check adapter
- `DevLinkCheck`: DevLink check adapter
- `MindCheck`: Mind check adapter
- `SecurityCheck`: Security check adapter

#### Types & Interfaces

- `CheckAdapter`: Check adapter interface

### Types & Interfaces

#### `CheckAdapter`

```typescript
interface CheckAdapter {
  id: CheckId;
  run(cwd: string, timeoutMs: number, ...args: unknown[]): Promise<AuditCheckResult>;
}
```

## 🔧 Configuration

### Configuration Options

All configuration via audit-core configuration.

## 🔗 Dependencies

### Runtime Dependencies

- `@kb-labs/audit-core` (`link:../audit-core`): Audit core
- `execa` (`^8.0.0`): Process execution
- `fs-extra` (`^11.0.0`): File system utilities

### Development Dependencies

- `@kb-labs/devkit` (`link:../../../kb-labs-devkit`): DevKit presets
- `@types/node` (`^24.7.0`): Node.js types
- `@types/fs-extra` (`^11.0.0`): fs-extra types
- `tsup` (`^8`): TypeScript bundler
- `typescript` (`^5`): TypeScript compiler
- `vitest` (`^3`): Test runner

## 🧪 Testing

### Test Structure

```
src/__tests__/
└── base.spec.ts
```

### Test Coverage

- **Current Coverage**: ~60%
- **Target Coverage**: 90%

## 📈 Performance

### Performance Characteristics

- **Time Complexity**: O(1) for adapter setup, O(n) for check execution
- **Space Complexity**: O(1)
- **Bottlenecks**: Check execution time

## 🔒 Security

### Security Considerations

- **Process Execution**: Secure process execution
- **Timeout Handling**: Timeout limits for checks

### Known Vulnerabilities

- None

## 🐛 Known Issues & Limitations

### Known Issues

- None currently

### Limitations

- **Check Types**: Fixed check types
- **Tool Dependencies**: Requires external tools (ESLint, TypeScript, Vitest)

### Future Improvements

- **More Check Types**: Additional check types
- **Plugin System**: Plugin system for custom checks

## 🔄 Migration & Breaking Changes

### Migration from Previous Versions

No breaking changes in current version (0.1.0).

### Breaking Changes in Future Versions

- None planned

## 📚 Examples

### Example 1: Use Built-in Checks

```typescript
import { StyleCheck, TypesCheck } from '@kb-labs/audit-checks';

const styleCheck = new StyleCheck();
const result = await styleCheck.run(process.cwd(), 30000);
```

### Example 2: Create Custom Check

```typescript
import { BaseCheckAdapter } from '@kb-labs/audit-checks';
import type { CheckId, AuditCheckResult } from '@kb-labs/audit-core';

class CustomCheck extends BaseCheckAdapter {
  id: CheckId = 'custom';

  async run(cwd: string, timeoutMs: number): Promise<AuditCheckResult> {
    // Custom check logic
    return this.createSuccessResult();
  }
}
```

## 🤝 Contributing

See [CONTRIBUTING.md](../../CONTRIBUTING.md) for development guidelines.

## 📄 License

MIT © KB Labs

