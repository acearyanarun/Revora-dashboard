import clsx from 'clsx'
import { Boxes, Check, Plug, RotateCcw, Server, SlidersHorizontal } from 'lucide-react'
import { useState } from 'react'
import { Button, PageHeader, Panel } from '../components/ui/primitives'
import { useWorkspace } from '../state/context'

const integrations = [
  { name: 'GitHub / GitLab', purpose: 'Fetch firmware source at a tagged version; open PRs for regression tests' },
  { name: 'Issue tracker (Jira, Linear)', purpose: 'Import customer-reported incidents and link investigations' },
  { name: 'Device log storage (S3, Memfault-style exports)', purpose: 'Pull device logs and coredumps by device ID' },
  { name: 'CI (GitHub Actions, Jenkins)', purpose: 'Run the regression library on every firmware build' },
]

const environments = [
  { name: 'Host-Based Test Harness', detail: 'Application logic compiled for Linux with simulated esp_wifi / esp_netif and an in-process MQTT broker', state: 'Demo simulation in browser' },
  { name: 'QEMU (ESP32)', detail: 'Full firmware image under Espressif QEMU with emulated networking', state: 'Planned' },
  { name: 'Hardware-in-the-Loop', detail: 'Physical boards with programmable AP and network impairment', state: 'Planned' },
]

export function SettingsPage() {
  const { resetDemo } = useWorkspace()
  const [name, setName] = useState('Example Co. — Firmware')
  const [timeout, setTimeoutS] = useState(120)
  const [requireReview, setRequireReview] = useState(true)
  const [saved, setSaved] = useState(false)
  const [resetDone, setResetDone] = useState(false)

  return (
    <div className="animate-in">
      <PageHeader title="Settings" subtitle="Workspace configuration, integrations, and testing environments." />
      <div className="grid gap-5 xl:grid-cols-2">
        <Panel title="Workspace" icon={<SlidersHorizontal className="size-4" />}>
          <form
            className="flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault()
              setSaved(true)
              setTimeout(() => setSaved(false), 1800)
            }}
          >
            <label className="flex flex-col gap-1.5">
              <span className="label">Workspace name</span>
              <input value={name} onChange={(e) => setName(e.target.value)} className="h-8 rounded-md border border-line-strong bg-[#070c16] px-2.5 text-[13px] focus:border-sky-400/60 focus:outline-none" />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="label">Default execution timeout (seconds)</span>
              <input type="number" min={10} max={3600} value={timeout} onChange={(e) => setTimeoutS(Number(e.target.value))} className="h-8 w-32 rounded-md border border-line-strong bg-[#070c16] px-2.5 text-[13px] tabular-nums focus:border-sky-400/60 focus:outline-none" />
            </label>
            <label className="flex items-start gap-2.5">
              <input type="checkbox" checked={requireReview} onChange={(e) => setRequireReview(e.target.checked)} className="mt-0.5 size-4 accent-sky-400" />
              <span className="text-[13px]">
                Require engineer review before a generated test is saved to the regression library
                <span className="block text-[11.5px] text-faint">Recommended. Generated tests are candidates until reviewed.</span>
              </span>
            </label>
            <div className="flex items-center gap-3">
              <Button type="submit" variant="primary">
                Save
              </Button>
              {saved && (
                <span className="animate-in inline-flex items-center gap-1 text-[12px] text-emerald-300">
                  <Check className="size-3.5" /> Saved for this session
                </span>
              )}
            </div>
          </form>
        </Panel>

        <Panel title="Testing environments" icon={<Server className="size-4" />}>
          <ul className="flex flex-col gap-3">
            {environments.map((e) => (
              <li key={e.name} className="flex items-start justify-between gap-4 rounded-md border border-line bg-raised/40 p-3">
                <div>
                  <div className="text-[13px] font-medium">{e.name}</div>
                  <div className="mt-0.5 text-[11.5px] text-faint">{e.detail}</div>
                </div>
                <span className={clsx('shrink-0 rounded px-1.5 py-0.5 text-[10.5px] font-medium uppercase', e.state === 'Planned' ? 'bg-line text-faint' : 'bg-amber-400/10 text-amber-200')}>
                  {e.state}
                </span>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel title="Integrations" icon={<Plug className="size-4" />} subtitle="None are connected in the prototype">
          <ul className="divide-y divide-line">
            {integrations.map((i) => (
              <li key={i.name} className="flex items-start justify-between gap-4 py-2.5 first:pt-0 last:pb-0">
                <div>
                  <div className="text-[13px]">{i.name}</div>
                  <div className="text-[11.5px] text-faint">{i.purpose}</div>
                </div>
                <span className="shrink-0 rounded bg-line px-1.5 py-0.5 text-[10.5px] font-medium text-faint uppercase">Not connected</span>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel title="Demo data" icon={<Boxes className="size-4" />}>
          <p className="mb-3 text-[13px] text-muted">
            All incidents, devices, and executions are sample data held in memory. Reset to restore the initial state (clears uploads, runs, and saved tests).
          </p>
          <div className="flex items-center gap-3">
            <Button
              variant="danger"
              icon={<RotateCcw className="size-3.5" />}
              onClick={async () => {
                await resetDemo()
                setResetDone(true)
                setTimeout(() => setResetDone(false), 1800)
              }}
            >
              Reset demo workspace
            </Button>
            {resetDone && <span className="animate-in text-[12px] text-emerald-300">Workspace reset</span>}
          </div>
        </Panel>
      </div>
    </div>
  )
}
