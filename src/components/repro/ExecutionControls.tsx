import { Code2, Download, Play, RotateCw, Sparkles, Square } from 'lucide-react'
import { Button } from '../ui/primitives'

export function ExecutionControls({
  generated,
  generating,
  running,
  onGenerate,
  onRun,
  onStop,
  onViewCode,
  onExport,
}: {
  generated: boolean
  generating: boolean
  running: boolean
  onGenerate: () => void
  onRun: () => void
  onStop: () => void
  onViewCode: () => void
  onExport: () => void
}) {
  return (
    <div className="flex flex-wrap items-center gap-2" role="toolbar" aria-label="Execution controls">
      <Button
        onClick={onGenerate}
        disabled={generating || running}
        icon={generated ? <RotateCw className="size-3.5" /> : <Sparkles className="size-3.5" />}
        variant={generated ? 'secondary' : 'primary'}
      >
        {generating ? 'Generating…' : generated ? 'Regenerate Test' : 'Generate Test'}
      </Button>
      <Button variant={generated ? 'primary' : 'secondary'} onClick={onRun} disabled={!generated || generating || running} icon={<Play className="size-3.5" />}>
        Run Reproduction
      </Button>
      <Button variant="danger" onClick={onStop} disabled={!running} icon={<Square className="size-3" />}>
        Stop Execution
      </Button>
      <span className="mx-1 hidden h-5 w-px bg-line sm:block" />
      <Button variant="ghost" onClick={onViewCode} disabled={!generated || generating} icon={<Code2 className="size-3.5" />}>
        View Test Code
      </Button>
      <Button variant="ghost" onClick={onExport} disabled={!generated || generating} icon={<Download className="size-3.5" />}>
        Export Test
      </Button>
    </div>
  )
}
