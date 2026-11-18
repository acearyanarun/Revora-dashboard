import type { Device } from '../types/domain'

/** DEMONSTRATION DATA — replace with `GET /devices` once a backend exists. */
export const devices: Device[] = [
  {
    id: 'dev-energy-monitor',
    name: 'ESP32 Energy Monitor',
    model: 'EM-200',
    platform: 'ESP32',
    protocol: 'Wi-Fi + MQTT',
    firmware: [
      { version: 'v1.4.2', framework: 'ESP-IDF', frameworkVersion: '5.1.2', releasedAt: '2026-10-21', sourceRef: 'github.com/example-co/em200-firmware@v1.4.2' },
      { version: 'v1.4.0', framework: 'ESP-IDF', frameworkVersion: '5.1.2', releasedAt: '2026-08-30' },
      { version: 'v1.3.7', framework: 'ESP-IDF', frameworkVersion: '5.0.4', releasedAt: '2026-06-02' },
    ],
    testEnvironments: [
      { environment: 'Host-Based Test Harness', availability: 'demo' },
      { environment: 'QEMU Emulation', availability: 'planned' },
      { environment: 'Hardware-in-the-Loop', availability: 'planned' },
    ],
  },
  {
    id: 'dev-env-sensor',
    name: 'Smart Environmental Sensor',
    model: 'ENV-S3',
    platform: 'ESP32-S3',
    protocol: 'Wi-Fi + MQTT/TLS',
    firmware: [
      { version: 'v2.1.0', framework: 'ESP-IDF', frameworkVersion: '5.2.1', releasedAt: '2026-10-02' },
      { version: 'v2.0.4', framework: 'ESP-IDF', frameworkVersion: '5.2.1', releasedAt: '2026-07-15' },
    ],
    testEnvironments: [
      { environment: 'Host-Based Test Harness', availability: 'demo' },
      { environment: 'Hardware-in-the-Loop', availability: 'planned' },
    ],
  },
  {
    id: 'dev-controller',
    name: 'Connected Controller',
    model: 'CC-10',
    platform: 'ESP32-C3',
    protocol: 'Wi-Fi + MQTT',
    firmware: [
      { version: 'v1.8.4', framework: 'ESP-IDF', frameworkVersion: '5.1.4', releasedAt: '2026-11-06' },
      { version: 'v1.8.3', framework: 'ESP-IDF', frameworkVersion: '5.1.4', releasedAt: '2026-09-19' },
    ],
    testEnvironments: [
      { environment: 'Host-Based Test Harness', availability: 'demo' },
      { environment: 'QEMU Emulation', availability: 'planned' },
    ],
  },
  {
    id: 'dev-smart-plug',
    name: 'Smart Plug',
    model: 'SP-1',
    platform: 'ESP32-C3',
    protocol: 'Wi-Fi + HTTPS',
    firmware: [{ version: 'v3.0.1', framework: 'Arduino-ESP32', frameworkVersion: '3.0.4', releasedAt: '2026-09-28' }],
    testEnvironments: [{ environment: 'Host-Based Test Harness', availability: 'planned' }],
  },
]

export const deviceById = (id: string) => devices.find((d) => d.id === id)
