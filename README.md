# Revora — Engineering Dashboard (prototype)

Frontend prototype for Revora: turning customer-reported IoT firmware failures (initially ESP32 / ESP-IDF connectivity-recovery bugs) into executable reproduction tests.

> **Prototype.** All data is sample data. Test executions are a deterministic **browser-side demo simulation** — no ESP-IDF firmware is compiled or executed.

## Run

```bash
npm install
npm run dev          # http://localhost:5173
npm run build        # type-check + production build to dist/
npm run build:single # one self-contained dist/index.html (for static hosting / demos)
npm run lint         # oxlint
npm test             # vitest (engine, workflow, upload, and UI flow tests)
```

Stack: React 19, TypeScript, Vite, Tailwind CSS v4, React Router (hash routing), lucide-react.

## Demo walkthrough

1. **Overview** → click **INC-001** (or "Open INC-001").
2. **Investigation workspace** → inspect the swimlane timeline, click events to see raw ESP-IDF log lines, review Observed Facts / Hypotheses / Missing Evidence / Confirmed Findings, upload a `.log`/`.txt`/`.json`, add a repo URL (reference only).
3. **Generate Reproduction Scenario** → steps are generated with traceability back to the evidence.
4. **Run Reproduction** → steps execute sequentially, logs stream, the recovery assertion fails → **Target Failure Reproduced**. Workflow and findings update.
5. **Fix Validation** → run original vs. corrected builds side by side; checks flip FAIL → PASS. Save as a regression test.
6. **Regression Library** → test is now Passing with execution history and validation evidence; rerun or export the `.c` file.

## Structure

```
src/
  types/domain.ts              Domain model (Incident, Device, FirmwareVersion, Evidence, TimelineEvent,
                               Hypothesis, ReproductionScenario, TestExecution, ValidationResult, RegressionTest)
  data/                        Sample data only (incidents, devices, scenarios + demo scripts, validation, regression)
  services/api.ts              RevoraApi interface + demoApi implementation (backend seam)
  services/execution/          ExecutionEngine interface + DemoExecutionEngine
  state/                       Workspace store (reducer + context), workflow progress
  hooks/useExecution.ts        Engine-agnostic run/stop/stream state
  components/
    layout/                    DashboardLayout, SidebarNavigation
    investigation/             InvestigationTable, WorkflowStepper, EventTimeline, EvidencePanel (EvidenceUploader), AnalysisFindings
    repro/                     ReproductionScenario, ExecutionControls, ExecutionConsole, EnvironmentPanel, ReproductionOutcome
    validation/                ValidationComparison
    ui/                        Primitives, CodeBlock
  pages/                       Overview, Investigations, InvestigationDetail, LabIndex, ReproductionLab,
                               FixValidation, RegressionLibrary, RegressionDetail, Devices, Settings, Roadmap
```

## What is real vs. simulated

| Real (works in the browser) | Simulated / sample |
|---|---|
| Navigation, filtering, search | All incidents, devices, logs, findings |
| File upload: read, validated (.log/.txt/.json, 5 MB), line-counted, previewed — held in memory only | "AI" findings and generated scenario (pre-authored for INC-001) |
| Workflow state across pages (generate → reproduce → validate → save) | Test execution (scripted replay with a simulated clock) |
| Test code view / export, diff view | Proposed correction (PR #214) and comparison results |
| Reset demo (Settings) | Integrations (all "Not connected"), QEMU/HIL (planned) |

State is in memory; a page reload resets the demo.

## Backend needed for real firmware testing

- **Ingestion service** — incident import (support/issue tracker), evidence storage (object store), log parsing into `TimelineEvent`s (ESP-IDF log format, coredumps, reset reasons).
- **Source integration** — GitHub/GitLab app to fetch firmware at a tag/commit; build metadata (sdkconfig, IDF version).
- **Analysis service** — LLM + rules over logs/source producing `Finding`s with evidence references; hypotheses stay unverified until a run confirms them.
- **Scenario generator** — emits Unity test cases against a harness API (`net_sim`, `mqtt_broker_sim`, `clock_sim`).
- **Test runner** — sandboxed workers that build the app component for a Linux host target (ESP-IDF `linux` target / CMock-style mocks) or run the full image in Espressif QEMU; later HIL rigs. Streams step/log events.
- **Execution API** — `POST /executions`, events over SSE/WebSocket mapped to `ExecutionListener` (`onStepStart`, `onLog`, `onStepComplete`, `onComplete`). Implement `ExecutionEngine` and pass it via `RevoraApi.executionEngine`.
- **Persistence** — Postgres for incidents/scenarios/executions/regression tests; artifact storage for logs and test files.
- **CI hook** — run the regression library on every firmware build.

To swap in a backend, implement `RevoraApi` (see the REST mapping in `src/services/api.ts`) and replace `demoApi` in `src/main.tsx`.
