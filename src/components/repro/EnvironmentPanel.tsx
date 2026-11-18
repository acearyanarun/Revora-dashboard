import { Server } from 'lucide-react'
import type { ExecutionEnvironment } from '../../types/domain'

export function EnvironmentPanel({ env }: { env: ExecutionEnvironment }) {
  const rows: [string, string][] = [
    ['Target', env.target],
    ['Framework', env.framework],
    ['Execution Mode', env.mode],
    ['Network', env.network],
    ['MQTT Broker', env.mqttBroker],
    ['Firmware Version', env.firmwareVersion],
  ]
  return (
    <div className="rounded-lg border border-line bg-raised/40">
      <div className="flex items-center gap-2 border-b border-line px-3 py-2.5">
        <Server className="size-4 text-muted" />
        <span className="text-[12.5px] font-semibold">Execution environment</span>
        <span className="ml-auto rounded border border-dashed border-amber-400/40 bg-amber-400/5 px-1.5 py-0.5 text-[10.5px] font-semibold tracking-wide text-amber-200 uppercase">
          Demo Simulation
        </span>
      </div>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5 px-3 py-3 sm:grid-cols-3">
        {rows.map(([k, v]) => (
          <div key={k} className="min-w-0">
            <dt className="label mb-0.5">{k}</dt>
            <dd className="truncate text-[12.5px] text-fg">{v}</dd>
          </div>
        ))}
      </dl>
      <p className="border-t border-line px-3 py-2 text-[11px] leading-snug text-faint">
        Runs are replayed by a deterministic browser-side script. No ESP-IDF firmware is compiled or executed. The engine is swappable for a real host-harness runner.
      </p>
    </div>
  )
}
