import type { Evidence, Finding, Incident, ReproductionScenario, TimelineEvent, TimelineLane, TimelineSeverity } from '../types/domain'

/** Conservative ESP-IDF connectivity parser. It only emits observations backed by timestamped log lines. */
export function parseConnectivityLog(evidence: Evidence): TimelineEvent[] {
  if (!evidence.rawText || evidence.kind !== 'device_log') return []
  const events: TimelineEvent[] = []
  let firstTick: number | undefined
  for (const [lineIndex, raw] of evidence.rawText.split(/\r?\n/).entries()) {
    const time = raw.match(/\b[DIWEV]\s*\(\s*(\d+)\s*\)/)
    if (!time) continue
    const tick = Number(time[1])
    if (!Number.isFinite(tick)) continue
    firstTick ??= tick

    let lane: TimelineLane
    let severity: TimelineSeverity
    let label: string
    if (/WIFI_EVENT_STA_DISCONNECTED|wi-?fi.*disconn|wifi:.*disconnected|BEACON_TIMEOUT/i.test(raw)) {
      lane = 'wifi'; severity = 'failure'; label = 'Wi-Fi disconnected'
    } else if (/WIFI_EVENT_STA_CONNECTED|wifi:connected|wi-?fi.*connected/i.test(raw)) {
      lane = 'wifi'; severity = 'success'; label = 'Wi-Fi connected'
    } else if (/IP_EVENT_STA_GOT_IP|got.ip|ip address acquired/i.test(raw)) {
      lane = 'ip'; severity = 'success'; label = 'IP address acquired'
    } else if (/MQTT_EVENT_DISCONNECTED|mqtt.*disconnected/i.test(raw)) {
      lane = 'mqtt'; severity = 'warning'; label = 'MQTT disconnected'
    } else if (/MQTT_EVENT_CONNECTED|mqtt.*connected/i.test(raw)) {
      lane = 'mqtt'; severity = 'success'; label = 'MQTT connected'
    } else if (/mqtt.*(publish.*fail|write.*error|publish failed)/i.test(raw)) {
      lane = 'telemetry'; severity = 'failure'; label = 'MQTT publication failed'
    } else if (/(mqtt.*publish.*(ok|success)|telemetry.*published)/i.test(raw)) {
      lane = 'telemetry'; severity = 'success'; label = 'Telemetry publication reported'
    } else continue

    events.push({
      id: `${evidence.id}-line-${lineIndex + 1}`,
      t: Math.max(0, (tick - firstTick) / 1000),
      timestamp: `+${((tick - firstTick) / 1000).toFixed(1)}s`,
      label, lane, severity, raw: [raw], source: `${evidence.name}:${lineIndex + 1}`,
    })
    if (events.length >= 60) break
  }
  return events
}

export function findingsFromTimeline(events: TimelineEvent[]): Finding[] {
  const findings: Finding[] = events.filter((e) => e.severity === 'failure').map((e) => ({
    id: `observed-${e.id}`, kind: 'observed',
    statement: `${e.label} appears in ${e.source}. This does not, by itself, establish a root cause.`,
    evidenceRefs: [e.id],
  }))
  const disconnected = events.find((e) => e.lane === 'wifi' && e.severity === 'failure')
  const recovered = disconnected && events.find((e) => e.lane === 'ip' && e.severity === 'success' && e.t > disconnected.t)
  if (disconnected && recovered) findings.push({
    id: `hypothesis-${disconnected.id}`, kind: 'hypothesis', verification: 'unverified',
    statement: 'Connectivity recovery may be incomplete after IP re-acquisition. A broker-side assertion is needed to confirm whether telemetry resumes.',
    evidenceRefs: [disconnected.id, recovered.id],
  })
  findings.push({
    id: 'missing-broker-capture', kind: 'missing',
    statement: 'Broker-side MQTT receipt evidence and a repeatable test are required to confirm an end-to-end publication failure.',
  })
  return findings
}

/** A reviewable test plan, not an executable C test or evidence of reproduction. */
export function createConnectivityCandidate(incident: Incident, outageSeconds = 10, recoverySeconds = 10, reviewed = false): ReproductionScenario {
  const wifiEvent = incident.timeline.find((e) => e.lane === 'wifi' && e.severity === 'failure')
  const ipEvent = wifiEvent && incident.timeline.find((e) => e.lane === 'ip' && e.t > wifiEvent.t)
  const steps: ReproductionScenario['steps'] = [
    { id: 'setup', order: 1, kind: 'setup', title: 'Boot firmware and connect to test AP', detail: 'Flash the selected firmware, start serial capture, connect to a controlled Wi-Fi access point.' },
    { id: 'baseline', order: 2, kind: 'assertion', title: 'Confirm baseline MQTT telemetry', detail: 'An independent MQTT subscriber must receive at least one publication before introducing a fault.' },
    { id: 'drop', order: 3, kind: 'fault', title: 'Interrupt Wi-Fi connectivity', detail: `Disable the controlled AP for ${outageSeconds} seconds.`, derivedFrom: wifiEvent?.source ?? 'Engineer-selected fault assumption' },
    { id: 'restore', order: 4, kind: 'action', title: 'Restore Wi-Fi', detail: 'Re-enable the AP and wait for the device to reacquire an IP address.', derivedFrom: ipEvent?.source ?? 'Recovery event not observed; engineer review required' },
    { id: 'assert', order: 5, kind: 'assertion', title: 'Verify broker receives telemetry again', detail: `After IP acquisition, the MQTT broker must receive telemetry within ${recoverySeconds} seconds. Observe actual broker traffic.` },
  ]
  const spec = {
    schema: 'revora-hil-scenario/v1',
    incidentId: incident.id,
    firmwareRef: incident.firmwareSourceRef ?? incident.firmwareVersion,
    sourceEvidence: incident.evidence.filter((e) => e.kind === 'device_log').map((e) => e.name),
    reviewRequired: !reviewed,
    network: { fault: 'access-point-outage', outageSeconds },
    assertions: { baselineBrokerPublish: true, ipReacquisition: true, brokerPublishWithinSeconds: recoverySeconds },
    notes: ['Requires a configured physical ESP32 runner and controlled access point.', 'The outage and recovery windows are editable engineering assumptions, not measurements inferred from the log.'],
  }
  return {
    id: `candidate-${incident.id}`,
    incidentId: incident.id,
    testName: `mqtt_recovery_${incident.id.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
    description: 'Candidate connectivity recovery scenario based on log observations and explicitly labeled assumptions.',
    steps,
    environment: {
      target: 'Physical ESP32', framework: incident.framework, mode: 'Hardware-in-the-Loop', network: 'Controlled AP',
      mqttBroker: 'Test Environment', firmwareVersion: incident.firmwareVersion, engine: 'remote-runner',
    },
    testCode: JSON.stringify(spec, null, 2),
    targetFailureSignature: ['IP address reacquired after fault', 'No MQTT publish observed at broker before recovery deadline'],
    provenance: 'log-derived', codeFormat: 'json', reviewed, outageSeconds, recoverySeconds,
  }
}
