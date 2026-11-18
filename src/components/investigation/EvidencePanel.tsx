import clsx from 'clsx'
import { FileCode2, FileJson, FileText, GitBranch, Link2, MessageSquareText, Network, Settings2, UploadCloud } from 'lucide-react'
import { useRef, useState, type DragEvent } from 'react'
import { formatBytes, formatDate } from '../../lib/format'
import { ACCEPTED_EVIDENCE } from '../../services/api'
import { useWorkspace } from '../../state/context'
import type { Evidence, EvidenceKind, Incident } from '../../types/domain'
import { Button } from '../ui/primitives'

const kindMeta: Record<EvidenceKind, { label: string; icon: typeof FileText }> = {
  device_log: { label: 'Device log', icon: FileText },
  firmware_source_ref: { label: 'Firmware source reference', icon: FileCode2 },
  customer_report: { label: 'Customer issue description', icon: MessageSquareText },
  device_config: { label: 'Device configuration', icon: Settings2 },
  network_events: { label: 'Network events', icon: Network },
}

function EvidenceRow({ e }: { e: Evidence }) {
  const [open, setOpen] = useState(false)
  const M = kindMeta[e.kind]
  const Icon = e.name.endsWith('.json') ? FileJson : M.icon
  return (
    <li className="animate-in rounded-md border border-line bg-raised/50">
      <button type="button" onClick={() => setOpen((o) => !o)} className="flex w-full items-start gap-2.5 px-3 py-2 text-left" aria-expanded={open}>
        <Icon className="mt-0.5 size-4 shrink-0 text-muted" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-[12.5px] font-medium text-fg">{e.name}</span>
          </div>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[11px] text-faint">
            <span>{M.label}</span>
            {e.sizeBytes != null && <span>· {formatBytes(e.sizeBytes)}</span>}
            {e.lineCount != null && <span>· {e.lineCount.toLocaleString()} lines</span>}
            <span>· {formatDate(e.addedAt)}</span>
          </div>
        </div>
        <span
          className={clsx(
            'shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium uppercase',
            e.source === 'browser-upload' && 'bg-sky-400/10 text-sky-300',
            e.source === 'reference' && 'bg-violet-400/10 text-violet-300',
            e.source === 'sample' && 'bg-line text-faint',
          )}
        >
          {e.source === 'browser-upload' ? 'Uploaded' : e.source === 'reference' ? 'Reference' : 'Sample'}
        </span>
      </button>
      {open && (e.preview || e.note) && (
        <div className="border-t border-line px-3 py-2">
          {e.note && <p className="mb-1.5 text-[11.5px] text-muted">{e.note}</p>}
          {e.preview && <pre className="max-h-32 overflow-auto rounded bg-[#060a12] p-2 font-mono text-[11px] whitespace-pre-wrap text-slate-400">{e.preview}</pre>}
        </div>
      )}
    </li>
  )
}

export function EvidenceUploader({ incidentId }: { incidentId: string }) {
  const { addEvidence } = useWorkspace()
  const input = useRef<HTMLInputElement>(null)
  const [drag, setDrag] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const handle = async (files: FileList | null) => {
    if (!files?.length) return
    setError(null)
    setBusy(true)
    for (const f of Array.from(files)) {
      try {
        await addEvidence(incidentId, f)
      } catch (err) {
        setError(`${f.name}: ${(err as Error).message}`)
      }
    }
    setBusy(false)
    if (input.current) input.current.value = ''
  }

  const onDrop = (e: DragEvent) => {
    e.preventDefault()
    setDrag(false)
    void handle(e.dataTransfer.files)
  }

  return (
    <div id="evidence-upload">
      <label
        onDragOver={(e) => {
          e.preventDefault()
          setDrag(true)
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={onDrop}
        className={clsx(
          'flex cursor-pointer flex-col items-center gap-1.5 rounded-lg border border-dashed px-4 py-5 text-center transition-colors',
          drag ? 'border-sky-400/70 bg-sky-400/5' : 'border-line-strong hover:border-[#33476a] hover:bg-raised/50',
        )}
      >
        <UploadCloud className={clsx('size-5', drag ? 'text-sky-300' : 'text-muted')} />
        <span className="text-[12.5px] text-fg">{busy ? 'Reading files…' : 'Drop files or click to upload'}</span>
        <span className="text-[11px] text-faint">.log, .txt, .json · up to 5 MB</span>
        <input ref={input} type="file" multiple accept={ACCEPTED_EVIDENCE.join(',')} className="sr-only" onChange={(e) => void handle(e.target.files)} />
      </label>
      {error && <p className="mt-2 text-[11.5px] text-rose-300" role="alert">{error}</p>}
      <p className="mt-2 text-[11px] leading-snug text-faint">Parsed observations and a bounded log excerpt are retained in this browser’s local storage. Nothing is sent to a server. Keep the original log and clear browser storage when handling sensitive data.</p>
    </div>
  )
}

function RepoReference({ incidentId, initialValue }: { incidentId: string; initialValue?: string }) {
  const { repoRefs, setRepoRef } = useWorkspace()
  const saved = repoRefs[incidentId] ?? initialValue
  const [value, setValue] = useState(saved ?? '')
  const [error, setError] = useState<string | null>(null)

  const save = () => {
    try {
      const u = new URL(value.trim())
      if (!/^https?:$/.test(u.protocol)) throw new Error()
      setRepoRef(incidentId, u.toString())
      setError(null)
    } catch {
      setError('Enter a full URL, e.g. https://github.com/org/firmware')
    }
  }

  return (
    <div>
      <label htmlFor={`repo-${incidentId}`} className="label mb-1.5 flex items-center gap-1.5">
        <GitBranch className="size-3" /> Firmware repository URL
      </label>
      <div className="flex gap-2">
        <input
          id={`repo-${incidentId}`}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && save()}
          placeholder="https://github.com/org/firmware"
          className="h-8 min-w-0 flex-1 rounded-md border border-line-strong bg-[#070c16] px-2.5 font-mono text-[12px] text-fg placeholder:text-faint focus:border-sky-400/60 focus:outline-none"
        />
        <Button size="md" onClick={save} disabled={!value.trim()}>
          Save
        </Button>
      </div>
      {error && <p className="mt-1.5 text-[11.5px] text-rose-300">{error}</p>}
      {saved && (
        <div className="mt-2 flex items-start gap-2 rounded-md border border-violet-400/20 bg-violet-400/5 px-2.5 py-2 text-[11.5px]">
          <Link2 className="mt-0.5 size-3.5 shrink-0 text-violet-300" />
          <div className="min-w-0">
            <div className="truncate font-mono text-violet-200">{saved}</div>
            <div className="text-faint">Saved as a reference only. Git integration is not connected — the repository was not cloned or analyzed.</div>
          </div>
        </div>
      )}
    </div>
  )
}

export function EvidencePanel({ incident }: { incident: Incident }) {
  const present = new Set(incident.evidence.map((e) => e.kind))
  if (incident.firmwareSourceRef) present.add('firmware_source_ref')
  const expected: EvidenceKind[] = ['device_log', 'firmware_source_ref', 'customer_report', 'device_config', 'network_events']
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-1.5">
        {expected.map((k) => (
          <span
            key={k}
            className={clsx(
              'inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px]',
              present.has(k) ? 'bg-emerald-400/10 text-emerald-300' : 'bg-line/60 text-faint line-through decoration-faint/60',
            )}
          >
            {kindMeta[k].label}
          </span>
        ))}
      </div>
      {incident.evidence.length > 0 ? (
        <ul className="flex flex-col gap-1.5">
          {incident.evidence.map((e) => (
            <EvidenceRow key={e.id} e={e} />
          ))}
        </ul>
      ) : (
        <p className="text-xs text-muted">No evidence attached yet.</p>
      )}
      <EvidenceUploader incidentId={incident.id} />
      <RepoReference incidentId={incident.id} initialValue={incident.firmwareSourceRef} />
    </div>
  )
}
