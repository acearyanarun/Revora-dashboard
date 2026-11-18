# Revora — field failure reproduction dashboard

An intentionally narrow engineering workspace for **ESP32 / ESP-IDF Wi-Fi and MQTT recovery failures**: customer evidence → reviewable reproduction candidate → measured execution → saved regression test → optional corrected-build comparison.

## Run the frontend

```bash
npm ci
npm run dev
npm test
npm run lint
npm run build
```

The default is **DEMO mode**. The seeded INC-001 sample is a browser-only scripted story. It does **not** compile C, flash a board, observe MQTT packets, run a model, or prove a real firmware defect. Its exported C code uses illustrative headers and is **not compilable without a separate harness**.

## What's functional today

- Create investigations for ESP-IDF Wi-Fi/MQTT incidents, including customer symptoms, firmware version, and source reference.
- Upload `.log`, `.txt`, or `.json` evidence (up to 5 MB). A conservative parser recognizes **timestamped ESP-IDF connectivity events** and shows raw source-line references. Findings from uploaded logs are explicitly observations or unverified hypotheses.
- Produce a **review-required JSON hardware-test plan** from a parsed connectivity log. Engineers can set the AP outage duration and the broker recovery deadline. These values are assumptions; Revora does not invent measurements.
- Store new investigations, a bounded log excerpt (max 128,000 characters per upload), parsed events, review state, and test history in the browser's `localStorage`. The full original upload is **not archived**. No backend receives the file. Clear browser storage when working with sensitive data.
- View the seeded, explicitly labeled browser simulation for INC-001.
- Save a reproduced failure to the regression library **before any correction exists**; update the saved test after a corrected-build comparison.
- Export test plans, inspect execution logs, and reset the demonstration from the sidebar.

## What still requires a physical runner

There is no ESP32 or controllable access point attached to this repo. **Real execution is not available without external hardware and a backend.** To enable the fail-closed HTTP adapter, set:

```bash
VITE_REVORA_RUNNER_URL=http://localhost:8000 npm run dev
```

This changes the execution engine from `DemoExecutionEngine` to `HttpExecutionEngine`. The browser sends a JSON `POST /executions` request with this structure:

```json
{
  "scenario": {
    "id": "candidate-INC-EXAMPLE",
    "incidentId": "INC-EXAMPLE",
    "testName": "mqtt_recovery_inc_example",
    "steps": [],
    "testCode": "{ \"schema\": \"revora-hil-scenario/v1\" }",
    "codeFormat": "json",
    "reviewed": true
  },
  "variant": "original",
  "firmwareRef": "exact-firmware-commit"
}
```

The actual `scenario` object includes the full typed `ReproductionScenario` with environment, timeline references, assertion thresholds, and fault details; the example above is abbreviated. The runner must return a `TestExecution` object (see `src/types/domain.ts`) with:

- Matching `scenarioId`, `variant` and `firmwareRef`.
- `verdict`: `failed` when a genuine recovery assertion fails, `passed` when it succeeds, or `aborted`.
- `interpretation`: `target_failure_reproduced`, `target_not_reproduced`, `recovery_verified`, or `aborted`, consistently with the verdict and variant.
- `stepResults` with observed per-step outcomes; `log` with **actual** serial/broker evidence.
- Ideally `measurements`: `boardId`, `brokerMessagesReceived`, `recoveryTimeMs`, `attempts`, `reproducedAttempts`, and references to serial/MQTT capture artifacts.

For completed (non-aborted) runs, the adapter **requires** `measurements.boardId`, `measurements.brokerMessagesReceived` and `measurements.brokerCaptureArtifact`. A failed run must identify a failed assertion step, and a passing run must pass every assertion step. Infrastructure errors must be reported as HTTP errors, **never as a reproduced bug**.

If the runner is absent or returns an error, the dashboard displays a **runner error**. It does not substitute a successful scripted run. The external service must handle CORS for the dashboard's origin and must authenticate or bind to localhost rather than allowing arbitrary clients to control hardware.

### The first real hardware experiment

Use a physical ESP32, a controlled access point, a real MQTT broker with an **independent subscriber**, and a test runner that:

1. Flashes/identifies the precise original firmware build and captures serial output.
2. Observes a baseline MQTT publication at the broker.
3. Disables the AP for the approved outage duration, then restores it.
4. Waits for IP acquisition, then measures whether the **broker receives telemetry** before the approved deadline.
5. Reports raw serial and broker observations, actual assertion results and repeated-run statistics.
6. Repeats the same scenario on a corrected firmware build when one is supplied.

Use a no-fault control run as well. A test that fails even without the fault is not evidence of reproducing a specific issue. Report the reproducibility rate `k/N`, not just one green/red badge.

**The external runner, flashing implementation, hardware automation, actual AI scenario generation and source-code integration are still to be built.** This project now provides a focused frontend and a clearly defined integration contract; it does not claim these systems exist.

## Product scope

The navigation is deliberately limited to Overview, Investigations, Reproduction Lab and Regression Library. Device context is shown with the originating incident. There is no fleet OTA, formal-verification control panel, generic device inventory, unrelated roadmap or placeholder integration settings.

The MVP success criterion is not a polished demo: **a previously unseen real incident yields a reviewed scenario that demonstrably fails on the original firmware, passes on a corrected build, and can be rerun as a regression test**. Customer interviews should establish whether this materially reduces time-to-reproduction over existing workflows.
