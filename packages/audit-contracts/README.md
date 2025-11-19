# @kb-labs/audit-contracts

Contracts and Zod schemas for KB Labs Audit plugin (reports, run/show/list inputs and outputs).

## Vision & Purpose

**@kb-labs/audit-contracts** provides contracts and Zod schemas for KB Labs Audit. It defines JSON format for audit reports, input/output parameters for audit commands, and data structures for REST/Studio surfaces.

### Core Goals

- **Zod Schemas**: Validation schemas for audit reports and commands
- **TypeScript Types**: Type definitions derived from schemas
- **Contract Definition**: Public contracts for audit system

## Package Status

- **Version**: 0.1.0
- **Stage**: Stable
- **Status**: Production Ready ✅

## Architecture

### High-Level Overview

```
Audit Contracts
    │
    ├──► Zod Schemas (validation)
    ├──► TypeScript Types (type safety)
    └──► Contract Definitions
```

### Key Components

1. **Schemas** (`schema/`): Zod validation schemas
2. **Types** (`index.ts`): TypeScript type exports

## ✨ Features

- **Zod schemas** for audit reports
- **TypeScript types** derived from schemas
- **Report contracts** for audit results
- **List contracts** for check listings

## 📦 API Reference

### Main Exports

#### Schemas

- `AuditReportSchema`: Audit report schema
- `AuditCheckResultSchema`: Check result schema
- `AuditListChecksEntrySchema`: List checks entry schema

#### Types

- `AuditReportContract`: Audit report type
- `AuditCheckResultContract`: Check result type
- `AuditListChecksEntryContract`: List checks entry type

## 🔧 Configuration

### Configuration Options

No configuration needed - pure type definitions and schemas.

## 🔗 Dependencies

### Runtime Dependencies

- `zod` (`^3.23.8`): Schema validation

### Development Dependencies

- `@kb-labs/devkit` (`link:../../../kb-labs-devkit`): DevKit presets
- `@types/node` (`^24.7.0`): Node.js types
- `tsup` (`^8.5.0`): TypeScript bundler
- `typescript` (`^5.6.3`): TypeScript compiler
- `vitest` (`^3.2.4`): Test runner

## 🧪 Testing

### Test Structure

```
src/__tests__/
└── report.schema.spec.ts
```

### Test Coverage

- **Current Coverage**: ~60%
- **Target Coverage**: 90%

## 📈 Performance

### Performance Characteristics

- **Time Complexity**: O(1) for type operations, O(n) for schema validation
- **Space Complexity**: O(1)
- **Bottlenecks**: Schema validation for large reports

## 🔒 Security

### Security Considerations

- **Schema Validation**: Input validation via Zod schemas
- **Type Safety**: TypeScript type safety

### Known Vulnerabilities

- None

## 🐛 Known Issues & Limitations

### Known Issues

- None currently

### Limitations

- **Schema Validation**: Basic validation only

### Future Improvements

- **Enhanced Validation**: More validation rules

## 🔄 Migration & Breaking Changes

### Migration from Previous Versions

No breaking changes in current version (0.1.0).

### Breaking Changes in Future Versions

- None planned

## 📚 Examples

### Example 1: Validate Audit Report

```typescript
import { AuditReportSchema } from '@kb-labs/audit-contracts';

const report = AuditReportSchema.parse(rawReport);
```

### Example 2: Use Type-Safe Contracts

```typescript
import type { AuditReportContract } from '@kb-labs/audit-contracts';

function processReport(report: AuditReportContract) {
  // Type-safe report processing
}
```

## 🤝 Contributing

See [CONTRIBUTING.md](../../CONTRIBUTING.md) for development guidelines.

## 📄 License

MIT © KB Labs
