import { useEffect, useMemo, useState } from 'react'
import { getState, doOperation, getHistory, undo, redo, clearCalc } from './api'

function tokenize(expr) {
  const tokens = []
  let num = ''
  for (let i = 0; i < expr.length; i++) {
    const ch = expr[i]
    if ((ch >= '0' && ch <= '9') || ch === '.') {
      num += ch
    } else if ('+-*/%'.includes(ch)) {
      if (num) { tokens.push(parseFloat(num)); num = '' }
      tokens.push(ch)
    }
  }
  if (num) tokens.push(parseFloat(num))
  return tokens
}

function toRPN(tokens) {
  const out = []
  const stack = []
  const prec = { '+': 1, '-': 1, '*': 2, '/': 2, '%': 3 }
  for (const t of tokens) {
    if (typeof t === 'number') out.push(t)
    else {
      while (stack.length && prec[stack[stack.length - 1]] >= prec[t]) out.push(stack.pop())
      stack.push(t)
    }
  }
  while (stack.length) out.push(stack.pop())
  return out
}

function evalRPN(rpn) {
  const st = []
  for (const t of rpn) {
    if (typeof t === 'number') st.push(t)
    else {
      const b = st.pop() ?? 0
      const a = st.pop() ?? 0
      let v = 0
      if (t === '+') v = a + b
      else if (t === '-') v = a - b
      else if (t === '*') v = a * b
      else if (t === '/') v = b === 0 ? NaN : a / b
      else if (t === '%') v = a % b
      st.push(v)
    }
  }
  return st.pop() ?? 0
}

export default function App() {
  const [theme, setTheme] = useState('light')
  const [buffer, setBuffer] = useState('')
  const [currentValue, setCurrentValue] = useState(0)
  const [lastOperation, setLastOperation] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [canUndo, setCanUndo] = useState(false)
  const [canRedo, setCanRedo] = useState(false)
  const [history, setHistory] = useState([])
  const [historyInfo, setHistoryInfo] = useState(null)

  // keyboard input
  useEffect(() => {
    function onKey(e) {
      const k = e.key
      if ((k >= '0' && k <= '9') || k === '.') {
        e.preventDefault()
        setBuffer(prev => {
          if (k === '.') {
            const hasDot = /(^|[^0-9.])[0-9]*\.[0-9]*$/.test(prev)
            if (prev.includes('.') && !hasDot) return prev
          }
          return prev + k
        })
        return
      }
      const map = { '+': 'sumar', '-': 'restar', '*': 'multiplicar', '/': 'dividir' }
      if (map[k]) {
        e.preventDefault()
        submitOperation(map[k])
        return
      }
      if (k === 'Backspace') {
        e.preventDefault(); setBuffer(prev => prev.slice(0, -1)); return
      }
      if (k === 'Escape') { e.preventDefault(); clearAll(); return }
      if (k === 'Enter' || k === '=') { e.preventDefault(); /* step-by-step mode: no-op */ return }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // theme init
  useEffect(() => {
    const saved = localStorage.getItem('theme')
    if (saved === 'dark' || saved === 'light') {
      setTheme(saved)
    }
  }, [])

  // apply theme class to html
  useEffect(() => {
    const root = document.documentElement
    if (theme === 'dark') root.classList.add('dark')
    else root.classList.remove('dark')
    localStorage.setItem('theme', theme)
  }, [theme])

  async function refreshState() {
    setError('')
    const s = await getState()
    const d = s.data
    setCurrentValue(d.currentValue)
    setLastOperation(d.lastOperation)
    setCanUndo(Boolean(d.historyInfo?.canUndo ?? d.canUndo))
    setCanRedo(Boolean(d.historyInfo?.canRedo ?? d.canRedo))
  }

  async function refreshHistory() {
    try {
      const h = await getHistory()
      setHistory(h.data.history || [])
      setHistoryInfo(h.data.info || null)
    } catch {}
  }

  function append(ch) {
    setError('')
    setBuffer(prev => {
      if (ch === '.') {
        if (prev.includes('.')) return prev
      }
      return prev + ch
    })
  }

  function backspace() { setBuffer(prev => prev.slice(0, -1)) }

  async function clearAll() {
    setBuffer('')
    setLoading(true)
    setError('')
    try {
      const r = await clearCalc()
      const d = r.data
      setCurrentValue(d.currentValue)
      setLastOperation(d.lastOperation)
      setCanUndo(false)
      setCanRedo(false)
      refreshHistory()
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  async function jumpTo(targetIndex) {
    const curr = (historyInfo && typeof historyInfo.currentIndex === 'number')
      ? historyInfo.currentIndex
      : (history.findIndex(h => h.isCurrent) >= 0 ? history.findIndex(h => h.isCurrent) : 0)

    if (targetIndex === curr) return

    setLoading(true)
    setError('')
    try {
      const forward = targetIndex > curr
      let steps = Math.abs(targetIndex - curr)
      while (steps-- > 0) {
        const r = forward ? await redo() : await undo()
        const d = r.data
        setCurrentValue(d.currentValue)
        setLastOperation(d.lastOperation)
        setCanUndo(Boolean(d.canUndo))
        setCanRedo(Boolean(d.canRedo))
      }
      await refreshHistory()
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  async function submitOperation(op) {
    const val = Number(buffer)
    if (!Number.isFinite(val)) return
    setLoading(true)
    setError('')
    try {
      const r = await doOperation(op, val)
      const d = r.data
      setCurrentValue(d.result)
      setLastOperation(d.operation)
      setCanUndo(Boolean(d.canUndo))
      setCanRedo(Boolean(d.canRedo))
      setBuffer('')
      refreshHistory()
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleUndo() {
    setLoading(true)
    setError('')
    try {
      const r = await undo()
      const d = r.data
      setCurrentValue(d.currentValue)
      setLastOperation(d.lastOperation)
      setCanUndo(Boolean(d.canUndo))
      setCanRedo(Boolean(d.canRedo))
      refreshHistory()
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleRedo() {
    setLoading(true)
    setError('')
    try {
      const r = await redo()
      const d = r.data
      setCurrentValue(d.currentValue)
      setLastOperation(d.lastOperation)
      setCanUndo(Boolean(d.canUndo))
      setCanRedo(Boolean(d.canRedo))
      refreshHistory()
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refreshState()
    refreshHistory()
  }, [])

  return (
    <div className="min-h-screen w-full flex flex-col items-center p-4">
      <div className="w-full max-w-5xl flex justify-end mb-2">
        <button
          className="px-3 py-1 rounded bg-black/5 dark:bg-white/10 text-sm"
          onClick={() => setTheme(prev => (prev === 'dark' ? 'light' : 'dark'))}
        >
          {theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}
        </button>
      </div>
      <div className="w-full max-w-5xl grid md:grid-cols-2 gap-6">
        {/* Calculadora */}
        <div className="w-full max-w-sm">
          <div className="flex items-end justify-end p-6">
            <div className="text-right">
              <div className="text-5xl text-neutral-900 dark:text-neutral-200 tracking-wide min-h-[3rem]">{buffer || currentValue}</div>
              <div className="text-xs text-neutral-500 mt-1">{lastOperation}</div>
            </div>
          </div>

          <div className="p-6 grid grid-cols-4 gap-4 place-items-center">
            <button className="btn btn-ghost" disabled={loading} onClick={clearAll}>C</button>
            <button className="btn btn-ghost" disabled={loading} onClick={backspace}>⌫</button>
            <button className="btn btn-op" disabled>%</button>
            <button className="btn btn-op" disabled={loading} onClick={() => submitOperation('dividir')}>÷</button>

            <button className="btn" onClick={() => append('7')}>7</button>
            <button className="btn" onClick={() => append('8')}>8</button>
            <button className="btn" onClick={() => append('9')}>9</button>
            <button className="btn btn-op" onClick={() => submitOperation('multiplicar')}>×</button>

            <button className="btn" onClick={() => append('4')}>4</button>
            <button className="btn" onClick={() => append('5')}>5</button>
            <button className="btn" onClick={() => append('6')}>6</button>
            <button className="btn btn-op" onClick={() => submitOperation('restar')}>−</button>

            <button className="btn" onClick={() => append('1')}>1</button>
            <button className="btn" onClick={() => append('2')}>2</button>
            <button className="btn" onClick={() => append('3')}>3</button>
            <button className="btn btn-op" onClick={() => submitOperation('sumar')}>+</button>

            <button className="btn" onClick={() => append('0')}>0</button>
            <button className="btn" onClick={() => append('.')}>.</button>
            <button className="btn btn-ghost" disabled={loading || !canUndo} onClick={handleUndo}>↶</button>
            <button className="btn btn-eq" disabled> = </button>
          </div>
        </div>

        {/* Historial */}
        <div className="px-4">
          <div className="text-sm text-neutral-400 flex items-center justify-between mb-2">
            <div>Historial</div>
            <div className="flex gap-2">
              <button className="px-3 py-1 rounded bg-white/5" disabled={loading || !canUndo} onClick={handleUndo}>Deshacer</button>
              <button className="px-3 py-1 rounded bg-white/5" disabled={loading || !canRedo} onClick={handleRedo}>Rehacer</button>
            </div>
          </div>
          <div className="text-xs text-neutral-500 mb-2">
            <div>Total: {historyInfo?.totalStates ?? '-'}</div>
            <div>Índice actual: {historyInfo?.currentIndex ?? '-'}</div>
          </div>
          <div className="space-y-2 max-h-[60vh] overflow-auto pr-2">
            {history.map((h, idx) => (
              <button
                key={idx}
                onClick={() => !loading && jumpTo(idx)}
                disabled={loading || h.isCurrent}
                className={`w-full text-left rounded border border-neutral-200 dark:border-white/10 p-2 cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition ${h.isCurrent ? 'outline outline-1 outline-orange-500' : ''}`}
              >
                <div className="text-sm">{h.state}</div>
                <div className="text-xs text-neutral-400">{h.operation}</div>
                <div className="text-[10px] text-neutral-500">{new Date(h.timestamp).toLocaleString()}</div>
              </button>
            ))}
            {history.length === 0 && <div className="text-neutral-500">Sin datos</div>}
          </div>
          {error && <div className="text-red-400 text-sm mt-3">{error}</div>}
        </div>
      </div>
    </div>
  )
}
