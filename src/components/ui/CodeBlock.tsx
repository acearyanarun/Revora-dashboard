import clsx from 'clsx'
import { Check, Copy } from 'lucide-react'
import { Fragment, useState, type ReactNode } from 'react'

const KEYWORDS = new Set([
  'static', 'const', 'if', 'else', 'return', 'void', 'int', 'struct', 'for', 'while', 'sizeof', 'char', 'bool', 'true', 'false', 'NULL',
])

/** Tiny C tokenizer: enough for comments, strings, keywords, macros, numbers. */
function highlightC(line: string): ReactNode[] {
  const out: ReactNode[] = []
  const re = /(\/\*.*?\*\/|\/\*.*$|^\s*\*.*$|\/\/.*$)|("(?:[^"\\]|\\.)*")|(#\s*\w+)|\b(\d+)\b|\b([A-Z][A-Z0-9_]{2,})\b|\b([a-z_][a-z0-9_]*)(?=\s*\()|\b(\w+)\b/g
  let last = 0
  let m: RegExpExecArray | null
  let k = 0
  while ((m = re.exec(line))) {
    if (m.index > last) out.push(line.slice(last, m.index))
    const [tok] = m
    let cls = ''
    if (m[1]) cls = 'text-slate-500 italic'
    else if (m[2]) cls = 'text-emerald-300'
    else if (m[3]) cls = 'text-violet-300'
    else if (m[4]) cls = 'text-amber-300'
    else if (m[5]) cls = 'text-sky-300'
    else if (m[6]) cls = 'text-cyan-200'
    else if (m[7] && KEYWORDS.has(tok)) cls = 'text-violet-300'
    out.push(cls ? <span key={k++} className={cls}>{tok}</span> : tok)
    last = m.index + tok.length
  }
  if (last < line.length) out.push(line.slice(last))
  return out
}

export function CodeBlock({ code, language = 'c', className, maxHeight = 'max-h-[60vh]' }: { code: string; language?: 'c' | 'diff' | 'text'; className?: string; maxHeight?: string }) {
  const [copied, setCopied] = useState(false)
  const lines = code.replace(/\n$/, '').split('\n')
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      /* clipboard may be unavailable in sandboxed frames */
    }
  }
  return (
    <div className={clsx('group relative rounded-lg border border-line bg-[#060a12]', className)}>
      <button
        type="button"
        onClick={copy}
        className="absolute top-2 right-2 z-10 inline-flex items-center gap-1 rounded border border-line bg-raised px-2 py-1 text-[11px] text-muted opacity-0 transition group-hover:opacity-100 hover:text-fg focus:opacity-100"
      >
        {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
        {copied ? 'Copied' : 'Copy'}
      </button>
      <pre className={clsx('overflow-auto py-3 font-mono text-[12px] leading-[1.6]', maxHeight)}>
        <code>
          {lines.map((l, i) => {
            const diffCls =
              language === 'diff'
                ? l.startsWith('+') && !l.startsWith('+++')
                  ? 'bg-emerald-500/10 text-emerald-200'
                  : l.startsWith('-') && !l.startsWith('---')
                    ? 'bg-rose-500/10 text-rose-200'
                    : l.startsWith('@@')
                      ? 'text-sky-300/80'
                      : 'text-slate-400'
                : 'text-slate-300'
            return (
              <div key={i} className={clsx('flex px-3', diffCls)}>
                <span className="mr-4 w-7 shrink-0 text-right text-slate-600 select-none">{i + 1}</span>
                <span className="whitespace-pre">{language === 'c' ? <Fragment>{highlightC(l)}</Fragment> : l || ' '}</span>
              </div>
            )
          })}
        </code>
      </pre>
    </div>
  )
}
