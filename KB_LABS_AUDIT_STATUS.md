# KB Labs Audit — отчет и план миграции

## 1. Резюме
- Проект уже содержит рабочий оркестратор (core + checks + CLI), но остается утилитарным пакетом и не интегрирован как полноценный плагин kb CLI.
- По сравнению с `kb-labs-mind` и каркасом `kb-labs-plugin-template` отсутствуют `ManifestV2`, REST/Studio поверхности, setup-хэндлер, декларации артефактов и контрактный пакет.
- Mind-проверка вызывается как внешний CLI (`kb mind verify`) без единых типов и прав; отчеты не публикуются через plugin runtime.
- Требуется миграция к стандартной плагинной архитектуре (contracts → CLI/REST/Studio → artifacts/permissions), чтобы повторить поведение `kb-labs-mind`.

## 2. Архитектурный срез kb-labs-audit
### CLI слой
`audit-cli` экспортирует только кастомный `cli.manifest` и вспомогательные утилиты, поэтому kb CLI видит набор команд, но не плагинную декларацию `ManifestV2`.
```1:3:kb-labs-audit/packages/audit-cli/src/index.ts
export * from './cli.manifest';
export * from './utils';
export * from './package-scope';
```

Команды описываются локальным типом `CommandManifest`; нет схемы `kb.plugin/2`, setup/REST/Studio блоков или прав доступа.
```5:104:kb-labs-audit/packages/audit-cli/src/cli.manifest.ts
// Local type definition to avoid external dependencies
export type CommandManifest = {
  manifestVersion: '1.0';
  id: string;
  aliases?: string[];
  group: string;
  describe: string;
  longDescription?: string;
  requires?: string[];
  flags?: FlagDefinition[];
  examples?: string[];
  loader: () => Promise<{ run: any }>;
};
...
export const commands: CommandManifest[] = [
  { id: 'audit:run', group: 'audit', describe: 'Run quality audit checks', ... },
  { id: 'audit:list-checks', ... },
  { id: 'audit:show', ... },
  { id: 'audit:clean', ... }
];
```

### Check adapters и зависимости от Mind
Mind-проверка работает как внешний вызов `kb mind verify --json`, что подтверждает зависимость от уже реализованного плагина `kb-labs-mind` без возможности инлайнового запуска через plugin runtime.
```13:88:kb-labs-audit/packages/audit-checks/src/mind.ts
export class MindCheck extends BaseCheckAdapter {
  id = 'mind' as const;

  async run(cwd: string, timeoutMs: number): Promise<AuditCheckResult> {
    ...
    const { stdout, exitCode } = await execa(
      'kb',
      ['mind', 'verify', '--json'],
      { cwd, timeout: timeoutMs, reject: false }
    );
    ...
  }
}
```

### Итоги по текущему состоянию
- Нет `@kb-labs/plugin-manifest` и `manifest.v2.ts`, следовательно audit не устанавливается как плагин.
- Нет контракта (zod-схем) и REST/Studio поверхностей, отчеты доступны только через файловую систему `.kb/audit/`.
- Нет setup-хэндлера: плагин не может подготовить `.kb` директорию автоматически.
- Проверки Mind/Devlink полагаются на внешние плагины, но не объявляют артефакты/permissions.

## 3. Сравнение с референсом kb-labs-mind
`kb-labs-mind` объявляет полноценный ManifestV2 c CLI-командами, REST маршрутами, Studio-виджетами, артефактами и правами.
```11:189:kb-labs-mind/packages/mind-cli/src/manifest.v2.ts
export const manifest: ManifestV2 = {
  schema: 'kb.plugin/2',
  id: '@kb-labs/mind',
  version: '0.1.0',
  display: { name: 'Mind', description: 'AI-oriented dependency indexing' },
  cli: { commands: [{ id: 'init', ... }, { id: 'update', ... }, { id: 'pack', ... }, { id: 'feed', ... }, { id: 'query', ... }, { id: 'verify', ... }] },
  ...
};
```

REST и Studio блоки оформлены в том же файле, задают маршруты, права, квоты и схемы.
```439:567:kb-labs-mind/packages/mind-cli/src/manifest.v2.ts
  rest: {
    basePath: '/v1/plugins/mind',
    routes: [
      { method: 'POST', path: '/query', input: { zod: '@kb-labs/mind-contracts/schema#MindQueryRequestSchema' }, ... },
      { method: 'GET', path: '/verify', ... }
    ]
  },
  studio: {
    widgets: [
      { id: 'mind.query', kind: 'infopanel', ... },
      { id: 'mind.verify', kind: 'cardlist', ... }
    ],
    menus: [...],
    layouts: [...]
  },
  capabilities: ['fs:read', 'fs:write'],
  permissions: { fs: { mode: 'readWrite', allow: ['.kb/mind/**', ...] }, ... },
  artifacts: [
    { id: 'mind.pack.output', pathTemplate: '.kb/mind/pack/{profile}/{runId}.md' },
    { id: 'mind.query.output', pathTemplate: '.kb/mind/query/{profile}/{runId}.toon' }
  ]
};
```

## 4. Сравнение с каркасом kb-labs-plugin-template
Даже минимальный шаблон содержит setup-хэндлер, CLI, REST и Studio секции в `manifest.v2.ts`, что задает минимально жизнеспособный формат.
```3:140:kb-labs-plugin-template/packages/plugin-cli/src/manifest.v2.ts
export const manifest: ManifestV2 = {
  schema: 'kb.plugin/2',
  id: '@kb-labs/plugin-template',
  ...
  setup: { handler: './setup/handler.js#run', permissions: { fs: { mode: 'readWrite', ... } } },
  cli: { commands: [{ id: 'template:hello', handler: './cli/commands/hello/run#runHelloCommand', ... }] },
  rest: { basePath: '/v1/plugins/template', routes: [{ method: 'GET', path: '/hello', ... }] },
  studio: { widgets: [{ id: 'template.hello', ... }], menus: [...], layouts: [...] },
  capabilities: [],
  permissions: { fs: { mode: 'read', ... }, ... },
  artifacts: []
};
```

## 5. Ключевые расхождения и риски
1. **Отсутствие ManifestV2** — audit нельзя загрузить через plugin runtime; нет централизованных permissions/artefacts.
2. **Нет REST/Studio поверхности** — CI/Studio не могут потреблять результаты без чтения файлов.
3. **Нет setup/onboarding** — пользователю приходится вручную создавать `.kb/audit`.
4. **Mind/Devlink зависимость без декларации прав** — возможны ошибки разрешений в песочнице.
5. **Отсутствие контрактов** — нет стабильной схемы JSON отчета для API и документации.
6. **Нет сценариев, аналогичных `mind pack/query`** — audit не экспонирует действия через REST/Studio, только CLI.

## 6. План миграции к поведению kb-labs-mind
### Фаза 0 — подготовка
- Создать пакет `@kb-labs/audit-contracts` (zod-схемы для run/show/list/summary). Использовать подход из mind/contracts.
- Зафиксировать JSON схему текущего отчета (`.kb/audit/report.json`) и добавить конвертеры core → contracts.

### Фаза 1 — ManifestV2 и CLI
- Перенести `CommandManifest` в `manifest.v2.ts`, подключив `@kb-labs/plugin-manifest`.
- Поделить CLI команды: `audit run/show/list/clean` → `cli.commands` блока, добавить handler-paths (`./cli/commands/run#run` и т.д.).
- Объявить permissions/quotas (fs read `.kb/audit/**`, запуск внешних CLI).

### Фаза 2 — Setup + REST API
- Добавить `setup.handler` аналогично шаблону: создаёт `.kb/audit`, дефолтные конфиги, синхронизирует devkit.
- Реализовать REST маршруты:
  - `POST /run` (async run, возвращает report id и summary),
  - `GET /report/:id` (чтение сохранённого отчёта),
  - `GET /checks` (список поддерживаемых проверок).
- Каждому маршруту прикрепить zod-схемы из contracts и permissions, как в mind manifest.

### Фаза 3 — Studio и артефакты
- Сконфигурировать widgets: «Audit Dashboard» (cardlist c результатами), «Coverage Heatmap», «Last mind/devlink status».
- Добавить артефакты `.kb/audit/report.json`, `.kb/audit/summary.md`, `.kb/audit/summary.txt` в `artifacts` секцию.
- Объявить menus/layouts по образцу mind.

### Фаза 4 — Интеграция с Mind behavior
- Обновить `MindCheck` для опционального прямого использования REST `mind verify` (если плагин разрешает cross-plugin вызовы) или документировать требуемые permissions.
- Добавить комбинированные сценарии «audit feed» (run + mind verify) для parity с `mind feed/pack/query`.

### Фаза 5 — Тестирование и выпуск
- Покрыть core/CLI/REST Vitest тестами (unit + e2e CLI via `kb`).
- Прогнать сравнение с `kb-labs-mind` на демо-репозитории: audit run → REST fetch → Studio widget snapshot.
- Обновить документацию (`docs/architecture`, `docs/adr`) и подготовить релиз `0.2.0`.

## 7. Метрики готовности
- ✅ ManifestV2 и setup присутствуют.
- ✅ REST/Studio маршруты отдают актуальные данные без прямого чтения файлов.
- ✅ Артефакты объявлены, права описаны.
- ✅ Contracts + tests зафиксированы.
- ✅ Audit может запускаться и отображаться из kb Studio наравне с `kb-labs-mind`.

## 8. Кросс-плагинные зависимости и ограничения
- `MindCheck` по-прежнему вызывает `kb mind verify --json`, поэтому в ManifestV2 объявлены разрешения `fs:readWrite` для `.kb/mind/**`, а в документации по установке нужно напомнить, что плагин `@kb-labs/mind` и CLI `kb` должны быть установлены в той же рабочей среде.
- `SecurityCheck` использует `npm audit`, что требует наличия npm 8+; при отсутствии инструмента проверка помечается как `skipped`, но REST/Studio возвращают этот статус, поэтому потребители должны обрабатывать `available=false`.
- REST-эндпоинты (`/checks`, `/report/latest`) и Studio-виджеты читают `.kb/audit/**`; разрешения плагина ограничены чтением/записью внутри `.kb/audit` и не позволяют вызывать другие плагины напрямую. Для объединённых сценариев (пример: запуск Mind после Audit) нужно использовать orchestration уровня CLI.
- Все новые обработчики и setup работают в песочнице KB Labs и не требуют сетевого доступа; квоты по времени и памяти заданы в ManifestV2 и должны использоваться при настройке CI.
