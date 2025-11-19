# Package Architecture Description: @kb-labs/audit-checks

**Version**: 0.1.0
**Last Updated**: 2025-11-16

## Executive Summary

**@kb-labs/audit-checks** provides check adapters for KB Labs Audit. It includes adapters for style checks (ESLint), type checks (TypeScript), test checks (Vitest), build checks, devlink checks, mind checks, and security checks.

## 1. Package Overview

### 1.1 Purpose & Scope

**Primary Purpose**: Provide check adapters for audit system.

**Scope Boundaries**:
- **In Scope**: Check adapters, base adapter class, check execution
- **Out of Scope**: Check orchestration (in audit-core), CLI commands (in audit-cli)

**Domain**: Audit System / Check Adapters

### 1.2 Key Responsibilities

1. **Check Adapters**: Adapters for various quality checks
2. **Base Adapter**: Base class for implementing custom checks
3. **Check Execution**: Execute checks with timeout handling

## 2. High-Level Architecture

### 2.1 Architecture Diagram

```
Audit Checks
    │
    ├──► Base Adapter (base.ts)
    │   ├──► BaseCheckAdapter class
    │   ├──► Helper methods
    │   └──► Result creation
    │
    ├──► Style Check (style.ts)
    │   └──► ESLint execution
    │
    ├──► Types Check (types.ts)
    │   └──► TypeScript compilation
    │
    ├──► Tests Check (tests.ts)
    │   └──► Vitest execution
    │
    ├──► Build Check (build.ts)
    │   └──► Build execution
    │
    ├──► DevLink Check (devlink.ts)
    │   └──► DevLink validation
    │
    ├──► Mind Check (mind.ts)
    │   └──► Mind validation
    │
    └──► Security Check (security.ts)
        └──► Security validation
```

### 2.2 Architectural Style

- **Style**: Adapter Pattern
- **Rationale**: Adapt external tools to unified check interface

## 3. Component Architecture

### 3.1 Component: Base Adapter

- **Purpose**: Base class for check adapters
- **Responsibilities**: Provide base functionality, helper methods
- **Dependencies**: audit-core

### 3.2 Component: Check Adapters

- **Purpose**: Implement specific checks
- **Responsibilities**: Execute checks, return results
- **Dependencies**: execa, fs-extra, audit-core

## 4. Data Flow

```
check.run(cwd, timeoutMs)
    │
    ├──► Execute tool (ESLint/TypeScript/Vitest/etc)
    ├──► Parse output
    ├──► Create result
    └──► return AuditCheckResult
```

## 5. Design Patterns

- **Adapter Pattern**: Adapt external tools to unified interface
- **Template Method Pattern**: Base adapter with template methods
- **Strategy Pattern**: Different checks as strategies

## 6. Performance Architecture

- **Time Complexity**: O(1) for adapter setup, O(n) for check execution
- **Space Complexity**: O(1)
- **Bottlenecks**: Check execution time

## 7. Security Architecture

- **Process Execution**: Secure process execution
- **Timeout Handling**: Timeout limits for checks

---

**Last Updated**: 2025-11-16

