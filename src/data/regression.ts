import type { RegressionTest } from '../types/domain'
import { scenarios } from './scenarios'

/** DEMONSTRATION DATA — regression tests derived from earlier investigations. */
const inc001 = scenarios[0]

export const regressionTests: RegressionTest[] = [
  {
    id: 'rt-001',
    name: 'mqtt_recovery_after_wifi_loss',
    originIncidentId: 'INC-001',
    platform: 'ESP32',
    failureCategory: 'Connectivity Recovery',
    firmwareVersion: 'v1.4.2',
    status: 'draft',
    expectedBehavior: 'After a Wi-Fi outage and IP re-acquisition, the device re-establishes its MQTT session and publishes telemetry within two publish periods.',
    steps: inc001.steps.map((s) => s.title),
    code: inc001.testCode,
    history: [],
    validationEvidence: [],
  },
  {
    id: 'rt-002',
    name: 'wifi_reconnect_after_channel_change',
    originIncidentId: 'INC-003',
    platform: 'ESP32-C3',
    failureCategory: 'Connectivity Recovery',
    firmwareVersion: 'v1.8.4',
    lastExecutedAt: '2026-11-09T16:20:00Z',
    status: 'active',
    expectedBehavior: 'When the AP moves to a new channel, the station keeps retrying with backoff and reconnects within 30 s of the AP becoming reachable.',
    steps: ['Associate to AP on channel 1', 'Move simulated AP to channel 11', 'Observe reconnect attempts', 'Assert association within 30 s'],
    code: String.raw`TEST_CASE("wifi_reconnect_after_channel_change", "[connectivity][INC-003]")
{
    harness_reset();
    TEST_ASSERT_EQUAL(ESP_OK, ctrl_net_init(&cfg));
    net_sim_ap_set_channel(1);
    net_sim_wifi_associate("PlantFloor");
    TEST_ASSERT_TRUE(clock_sim_run_until(net_sim_has_ip, 5000));

    net_sim_ap_set_channel(11);          /* AP-initiated channel switch */
    clock_sim_advance(2000);

    TEST_ASSERT_TRUE_MESSAGE(clock_sim_run_until(net_sim_has_ip, 30000),
        "station stopped retrying after channel change");
}
`,
    history: [
      { at: '2026-11-01T10:12:00Z', firmwareRef: 'v1.8.3', verdict: 'failed', note: 'Target failure reproduced (reconnect loop exits after 5 attempts)' },
      { at: '2026-11-07T14:40:00Z', firmwareRef: 'PR #88 (candidate fix)', verdict: 'passed', note: 'Recovery verified in scenario' },
      { at: '2026-11-09T16:20:00Z', firmwareRef: 'v1.8.4', verdict: 'passed', note: 'Release candidate check' },
    ],
    validationEvidence: ['Original v1.8.3: assertion failed at reconnect step (matches field logs)', 'v1.8.4: all steps passed in host harness'],
  },
  {
    id: 'rt-003',
    name: 'mqtt_keepalive_survives_broker_restart',
    originIncidentId: 'INC-003',
    platform: 'ESP32-C3',
    failureCategory: 'Connectivity Recovery',
    firmwareVersion: 'v1.8.4',
    lastExecutedAt: '2026-11-09T16:21:00Z',
    status: 'active',
    expectedBehavior: 'If the broker restarts, the client detects the dropped session via keepalive and reconnects within keepalive × 1.5.',
    steps: ['Connect to broker', 'Restart simulated broker', 'Advance clock past keepalive', 'Assert reconnect and resumed publishes'],
    code: String.raw`TEST_CASE("mqtt_keepalive_survives_broker_restart", "[mqtt][INC-003]")
{
    harness_reset();
    TEST_ASSERT_EQUAL(ESP_OK, ctrl_net_init(&cfg));
    TEST_ASSERT_TRUE(clock_sim_run_until(mqtt_broker_sim_client_connected, 5000));
    mqtt_broker_sim_restart();
    TEST_ASSERT_TRUE(clock_sim_run_until(mqtt_broker_sim_client_connected,
                                         cfg.keepalive_s * 1500));
}
`,
    history: [{ at: '2026-11-09T16:21:00Z', firmwareRef: 'v1.8.4', verdict: 'passed', note: 'Added alongside INC-003 fix' }],
    validationEvidence: ['v1.8.4: passed in host harness'],
  },
  {
    id: 'rt-004',
    name: 'dhcp_renewal_before_lease_expiry',
    originIncidentId: 'INC-004',
    platform: 'ESP32',
    failureCategory: 'Connectivity Recovery',
    firmwareVersion: 'v1.4.0',
    lastExecutedAt: '2026-11-17T21:58:00Z',
    status: 'failing',
    expectedBehavior: 'Device renews its DHCP lease at T1 and keeps its address without dropping connectivity.',
    steps: ['Acquire 24 h lease', 'Advance clock to T1', 'Drop first DHCPREQUEST', 'Assert lease renewed before expiry'],
    code: String.raw`TEST_CASE("dhcp_renewal_before_lease_expiry", "[dhcp][INC-004]")
{
    harness_reset();
    net_sim_dhcp_lease_seconds(86400);
    net_sim_wifi_associate("HomeNet-5G");
    clock_sim_advance(43200 * 1000);      /* T1 */
    net_sim_drop_next(DHCP_REQUEST);
    TEST_ASSERT_TRUE(clock_sim_run_until(net_sim_lease_renewed, 3600 * 1000));
}
`,
    history: [{ at: '2026-11-17T21:58:00Z', firmwareRef: 'v1.4.0', verdict: 'failed', note: 'Candidate reproduction — still under analysis; not yet confirmed to match field behavior' }],
    validationEvidence: [],
  },
]
