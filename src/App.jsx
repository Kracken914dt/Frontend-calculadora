import { useEffect, useState } from 'react'
import { getState, getHistory, undo, redo, clearCalc, evaluate } from './api'
import { StepForward, StepBack, Moon, Sun } from "lucide-react"

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

  // keyboard input (build expression and evaluate with Enter/=)
  useEffect(() => {
    function onKey(e) {
      const k = e.key
      if ((k >= '0' && k <= '9') || k === '.' || k === '(' || k === ')') {
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
      if ('+-*/'.includes(k)) {
        e.preventDefault()
        setBuffer(prev => {
          if (!prev) return ''
          if ('+-*/'.includes(prev.slice(-1))) return prev.slice(0, -1) + k
          return prev + k
        })
        return
      }
      if (k === 'Backspace') {
        e.preventDefault(); setBuffer(prev => prev.slice(0, -1)); return
      }
      if (k === 'Escape') { e.preventDefault(); clearAll(); return }
      if (k === 'Enter' || k === '=') { e.preventDefault(); handleEvaluate(); return }
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
    } catch { }
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
      // After jumping, fetch state to preload the expression so the user can edit it
      const s = await getState()
      setBuffer(s.data.lastOperation || '')
      await refreshHistory()
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }



  async function handleEvaluate() {
    const expr = buffer.trim()
    if (!expr) return
    setLoading(true)
    setError('')
    try {
      const r = await evaluate(expr)
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
      setBuffer(d.lastOperation || '')
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
      setBuffer(d.lastOperation || '')
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
          className="flex items-center gap-2 px-3 py-1 rounded bg-black/5 dark:bg-white/10 text-sm hover:bg-black/10 dark:hover:bg-white/20 transition"
          onClick={() => setTheme(prev => (prev === 'dark' ? 'light' : 'dark'))}
        >
          {theme === 'dark' ? (
            <>
              <Sun size={16} />
              <span>Modo claro</span>
            </>
          ) : (
            <>
              <Moon size={16} />
              <span>Modo oscuro</span>
            </>
          )}
        </button>
      </div>
      <div className="w-full max-w-5xl grid md:grid-cols-2 gap-6">
        {/* Calculadora */}
        <div className="w-full max-w-sm bg-neutral-900 dark:bg-neutral-950 rounded-3xl shadow-lg p-4">
          <div className="flex items-end justify-end p-6">
            <div className="w-full rounded-2xl p-4 text-right shadow-inner border border-neutral-500/30 bg-gradient-to-b from-neutral-300 to-neutral-200 dark:from-neutral-800 dark:to-neutral-900">
              <div className="text-5xl text-neutral-900 dark:text-neutral-100 tracking-wide break-words min-h-[3rem]">
                {buffer || lastOperation || currentValue}
              </div>
              <div className="text-neutral-600 dark:text-neutral-400 mt-2 text-lg">
                = {currentValue}
              </div>
            </div>
          </div>



          <div className="p-6 grid grid-cols-4 gap-3 place-items-center">
            <button className="w-16 h-16 border border-neutral-600 rounded-2xl bg-neutral-800 text-white text-xl hover:bg-neutral-700 active:scale-95 transition" onClick={clearAll}>C</button>
            <button className="w-16 h-16 border border-neutral-600 rounded-2xl bg-neutral-800 text-white text-xl hover:bg-neutral-700 active:scale-95 transition" onClick={backspace}>⌫</button>
            <button className="w-16 h-16 border border-neutral-600 rounded-2xl bg-neutral-700 text-orange-400 text-xl hover:bg-neutral-600 active:scale-95 transition" onClick={() => append(')')}>)</button>
            <button className="w-16 h-16 border border-neutral-600 rounded-2xl bg-neutral-700 text-orange-400 text-xl hover:bg-neutral-600 active:scale-95 transition" onClick={() => append('/')}>÷</button>

            <button className="w-16 h-16 border border-neutral-600 rounded-2xl bg-neutral-800 text-white text-xl hover:bg-neutral-700 active:scale-95 transition" onClick={() => append('7')}>7</button>
            <button className="w-16 h-16 border border-neutral-600 rounded-2xl bg-neutral-800 text-white text-xl hover:bg-neutral-700 active:scale-95 transition" onClick={() => append('8')}>8</button>
            <button className="w-16 h-16 border border-neutral-600 rounded-2xl bg-neutral-800 text-white text-xl hover:bg-neutral-700 active:scale-95 transition" onClick={() => append('9')}>9</button>
            <button className="w-16 h-16 border border-neutral-600 rounded-2xl bg-neutral-700 text-orange-400 text-xl hover:bg-neutral-600 active:scale-95 transition" onClick={() => append('*')}>×</button>

            <button className="w-16 h-16 border border-neutral-600 rounded-2xl bg-neutral-800 text-white text-xl hover:bg-neutral-700 active:scale-95 transition" onClick={() => append('4')}>4</button>
            <button className="w-16 h-16 border border-neutral-600 rounded-2xl bg-neutral-800 text-white text-xl hover:bg-neutral-700 active:scale-95 transition" onClick={() => append('5')}>5</button>
            <button className="w-16 h-16 border border-neutral-600 rounded-2xl bg-neutral-800 text-white text-xl hover:bg-neutral-700 active:scale-95 transition" onClick={() => append('6')}>6</button>
            <button className="w-16 h-16 border border-neutral-600 rounded-2xl bg-neutral-700 text-orange-400 text-xl hover:bg-neutral-600 active:scale-95 transition" onClick={() => append('-')}>−</button>

            <button className="w-16 h-16 border border-neutral-600 rounded-2xl bg-neutral-800 text-white text-xl hover:bg-neutral-700 active:scale-95 transition" onClick={() => append('1')}>1</button>
            <button className="w-16 h-16 border border-neutral-600 rounded-2xl bg-neutral-800 text-white text-xl hover:bg-neutral-700 active:scale-95 transition" onClick={() => append('2')}>2</button>
            <button className="w-16 h-16 border border-neutral-600 rounded-2xl bg-neutral-800 text-white text-xl hover:bg-neutral-700 active:scale-95 transition" onClick={() => append('3')}>3</button>
            <button className="w-16 h-16 border border-neutral-600 rounded-2xl bg-neutral-700 text-orange-400 text-xl hover:bg-neutral-600 active:scale-95 transition" onClick={() => append('+')}>+</button>

            <button className="w-16 h-16 border border-neutral-600 rounded-2xl bg-neutral-800 text-white text-xl hover:bg-neutral-700 active:scale-95 transition" onClick={() => append('0')}>0</button>
            <button className="w-16 h-16 border border-neutral-600 rounded-2xl bg-neutral-800 text-white text-xl hover:bg-neutral-700 active:scale-95 transition" onClick={() => append('.')}>.</button>

            <button className="w-16 h-16 border border-neutral-600 rounded-2xl bg-neutral-700 text-orange-400 text-xl hover:bg-neutral-600 active:scale-95 transition" onClick={() => append('(')}>(</button>
            <button className="w-16 h-16 border border-orange-500 rounded-2xl bg-orange-600 text-white text-2xl font-bold hover:bg-orange-500 active:scale-95 transition" onClick={handleEvaluate}>=</button>
            <button
              className="w-16 h-16 flex items-center justify-center border border-neutral-600 rounded-2xl bg-neutral-800 text-white text-xl hover:bg-neutral-700 active:scale-95 transition"
              disabled={loading || !canUndo}
              onClick={handleUndo}
            >
              <StepBack size={29} />
            </button>
            <button
              className="w-16 h-16 flex items-center justify-center border border-neutral-600 rounded-2xl bg-neutral-800 text-white text-xl hover:bg-neutral-700 active:scale-95 transition"
              disabled={loading || !canRedo}
              onClick={handleRedo}
            >
              <StepForward size={29} />
            </button>



          </div>
        </div>


        {/* Historial */}
        <div className="px-4">
          <div className="text-sm text-neutral-400 flex items-center justify-between mb-2">
            <div>Historial</div>
            {/* <div className="flex gap-2">
              <button
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 text-neutral-200 hover:bg-white/10 transition disabled:opacity-40 disabled:cursor-not-allowed"
                disabled={loading || !canUndo}
                onClick={handleUndo}
              >
                <StepBack size={18} />
                <span>Deshacer</span>
              </button>

              <button
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 text-neutral-200 hover:bg-white/10 transition disabled:opacity-40 disabled:cursor-not-allowed"
                disabled={loading || !canRedo}
                onClick={handleRedo}
              >
                <span>Rehacer</span>
                <StepForward size={18} />
              </button>
            </div> */}
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
