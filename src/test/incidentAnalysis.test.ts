import { describe, expect, it } from 'vitest'
import { createConnectivityCandidate, findingsFromTimeline, parseConnectivityLog } from '../lib/incidentAnalysis'
import type { Evidence, Incident } from '../types/domain'

const evidence: Evidence = {
  id: 'uploaded', kind: 'device_log', name: 'serial.log', source: 'browser-upload', addedAt: '2026-11-18T00:00:00Z',
  rawText: [
    'I (1000) wifi:WIFI_EVENT_STA_CONNECTED',
    'I (1200) esp_netif:IP_EVENT_STA_GOT_IP',
    'W (2000) wifi:WIFI_EVENT_STA_DISCONNECTED reason=200',
    'I (12000) wifi:WIFI_EVENT_STA_CONNECTED',
    'I (13000) esp_netif:IP_EVENT_STA_GOT_IP',
    'E (15000) app:mqtt publish failed',
  ].join('\n'),
}

describe('incident candidate generation', () => {
  it('parses only observed ESP-IDF connectivity events with source line references', () => {
    const events = parseConnectivityLog(evidence)
    expect(events).toHaveLength(6)
    expect(events[2]).toMatchObject({ label: 'Wi-Fi disconnected', t: 1, source: 'serial.log:3' })
    expect(events.at(-1)?.label).toBe('MQTT publication failed')
    const findings = findingsFromTimeline(events)
    expect(findings.some((f) => f.kind === 'observed' && f.evidenceRefs?.includes(events[2].id))).toBe(true)
    expect(findings.some((f) => f.kind === 'hypothesis' && f.verification === 'unverified')).toBe(true)
  })

  it('does not pretend untimestamped or unrelated logs were analyzed', () => {
    expect(parseConnectivityLog({ ...evidence, rawText: 'WiFi disconnected\nMQTT failed' })).toEqual([])
    expect(parseConnectivityLog({ ...evidence, rawText: 'I (123) app: user pressed button' })).toEqual([])
  })

  it('creates a review-required JSON hardware plan, not fake executable C', () => {
    const incident = {
      id: 'INC-CUSTOM', firmwareVersion: 'abc123', framework: 'ESP-IDF',
      evidence: [evidence], timeline: parseConnectivityLog(evidence),
    } as Incident
    const candidate = createConnectivityCandidate(incident, 12, 20)
    expect(candidate.provenance).toBe('log-derived')
    expect(candidate.reviewed).toBe(false)
    expect(candidate.codeFormat).toBe('json')
    expect(JSON.parse(candidate.testCode).assertions.brokerPublishWithinSeconds).toBe(20)
    expect(candidate.steps.find((s) => s.kind === 'fault')?.derivedFrom).toBe('serial.log:3')
  })
})
