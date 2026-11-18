import type { ValidationResult } from '../types/domain'

/** DEMONSTRATION DATA — a proposed correction for INC-001 and its comparison checks. */
export const validations: ValidationResult[] = [
  {
    id: 'val-inc001',
    scenarioId: 'scn-mqtt-recovery',
    originalRef: 'em200-firmware @ v1.4.2 (a3f91c2)',
    correctionRef: 'em200-firmware PR #214 — fix/mqtt-reconnect-on-got-ip (e81d07b)',
    correctionSummary:
      'Trigger an explicit MQTT reconnect when the station re-acquires an IP address, instead of relying on the client to detect the dead socket.',
    correctionDiff: String.raw`--- a/components/app_connectivity/app_connectivity.c
+++ b/components/app_connectivity/app_connectivity.c
@@ -118,9 +118,16 @@ static void on_ip_event(void *arg, esp_event_base_t base,
     if (id == IP_EVENT_STA_GOT_IP) {
         ip_event_got_ip_t *ev = (ip_event_got_ip_t *)data;
         ESP_LOGI(TAG, "IP_EVENT_STA_GOT_IP — resuming telemetry loop");
-        xEventGroupSetBits(s_conn_events, NET_READY_BIT);
+        xEventGroupSetBits(s_conn_events, NET_READY_BIT);
+
+        /* The TCP socket from before the outage is dead but the client may
+         * not have observed it yet. Force a fresh session. */
+        if (s_mqtt_started) {
+            ESP_LOGI(TAG, "IP_EVENT_STA_GOT_IP -> esp_mqtt_client_reconnect()");
+            ESP_ERROR_CHECK_WITHOUT_ABORT(esp_mqtt_client_reconnect(s_mqtt));
+        }
     }
 }
`,
    checks: [
      { name: 'Initial Wi-Fi Connection', original: 'pass', corrected: 'pass' },
      { name: 'Initial MQTT Connection', original: 'pass', corrected: 'pass' },
      { name: 'Wi-Fi Recovery', original: 'pass', corrected: 'pass' },
      { name: 'MQTT Session Recovery', original: 'fail', corrected: 'pass' },
      { name: 'Telemetry Publication', original: 'fail', corrected: 'pass' },
    ],
    status: 'not_run',
    scopeNote:
      'This result describes behavior in the mqtt_recovery_after_wifi_loss scenario only. It does not establish that the change is safe in general, on hardware, or under other network conditions.',
  },
]

/** Maps validation checks to the scenario steps whose outcomes determine them. */
export const checkStepMap: Record<string, string[]> = {
  'Initial Wi-Fi Connection': ['s2'],
  'Initial MQTT Connection': ['s3', 's4'],
  'Wi-Fi Recovery': ['s6', 's7'],
  'MQTT Session Recovery': ['s8'],
  'Telemetry Publication': ['s9'],
}
