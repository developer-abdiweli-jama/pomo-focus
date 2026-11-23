import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { getDailyGoalById } from '../../db/repositories/goalRepository'
import { endSession, getSession, pauseSession, resumeSession } from '../../db/repositories/sessionRepository'
import { useFloatingTimerStore } from './floatingTimer.store'
import { useTimerStore } from './timer.store'

function formatTime(seconds: number) {
  const minutes = Math.floor(seconds / 60)
  const remainder = seconds % 60
  return `${minutes}:${remainder.toString().padStart(2, '0')}`
}

export function FloatingTimerOverlay() {
  const floatingWindow = useFloatingTimerStore((state) => state.window)
  const closeFloatingTimer = useFloatingTimerStore((state) => state.close)
  const isRunning = useTimerStore((state) => state.isRunning)
  const isPaused = useTimerStore((state) => state.isPaused)
  const plannedEndAt = useTimerStore((state) => state.plannedEndAt)
  const sessionId = useTimerStore((state) => state.sessionId)
  const pauseTimer = useTimerStore((state) => state.pause)
  const resumeTimer = useTimerStore((state) => state.resume)
  const resetTimer = useTimerStore((state) => state.reset)
  const [secondsLeft, setSecondsLeft] = useState(0)
  const [goalTitle, setGoalTitle] = useState('Focus session')
  const [confirmFinish, setConfirmFinish] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const updateRemaining = () => {
      if (plannedEndAt === null) {
        setSecondsLeft(0)
        return
      }
      const pausedAt = useTimerStore.getState().pausedAt
      setSecondsLeft(Math.max(0, Math.ceil((plannedEndAt - (pausedAt ?? Date.now())) / 1000)))
    }
    updateRemaining()
    if (!isRunning) return
    const interval = window.setInterval(updateRemaining, 250)
    return () => window.clearInterval(interval)
  }, [isRunning, plannedEndAt])

  useEffect(() => {
    if (!isRunning || plannedEndAt === null || plannedEndAt > Date.now() || sessionId === null) return
    const pausedAt = Date.now()
    pauseTimer(pausedAt)
    void pauseSession(sessionId, pausedAt).catch((err: unknown) => {
      setError(err instanceof Error ? err.message : 'Could not save the completed timer state.')
    })
  }, [isRunning, secondsLeft, plannedEndAt, sessionId, pauseTimer])

  useEffect(() => {
    let cancelled = false
    if (sessionId === null) {
      return
    }
    void getSession(sessionId).then(async (session) => {
      if (!session) return 'Focus session'
      const goal = await getDailyGoalById(session.dailyGoalId)
      return goal?.title ?? 'Focus session'
    }).then((title) => {
      if (!cancelled) setGoalTitle(title)
    }).catch(() => {
      if (!cancelled) setGoalTitle('Focus session')
    })
    return () => { cancelled = true }
  }, [sessionId])

  useEffect(() => {
    if (sessionId === null && floatingWindow) closeFloatingTimer()
  }, [sessionId, floatingWindow, closeFloatingTimer])

  const handleTogglePause = async () => {
    if (sessionId === null) return
    setError('')
    if (isPaused) {
      const resumedAt = Date.now()
      try {
        await resumeSession(sessionId, resumedAt)
        resumeTimer(resumedAt)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not resume the session.')
      }
    } else if (isRunning) {
      const pausedAt = Date.now()
      pauseTimer(pausedAt)
      try {
        await pauseSession(sessionId, pausedAt)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not pause the session.')
      }
    }
  }

  const handleFinish = async () => {
    if (sessionId === null) return
    setError('')
    try {
      await endSession(sessionId, Date.now())
      resetTimer()
      closeFloatingTimer()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not finish the session.')
    }
  }

  if (!floatingWindow || floatingWindow.closed) return null

  return createPortal(
    <main style={{ boxSizing: 'border-box', minHeight: '100vh', padding: 16, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', background: '#0b1220' }}>
      <div>
        <div style={{ color: '#94a3b8', fontSize: 12, letterSpacing: '0.12em', textTransform: 'uppercase' }}>FocusSpan · {isPaused ? 'Paused' : 'Focus'}</div>
        <div style={{ marginTop: 8, fontSize: 46, lineHeight: 1, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{formatTime(secondsLeft)}</div>
        <div style={{ marginTop: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#cbd5e1', fontSize: 13 }}>{goalTitle}</div>
        {error && <div role="alert" style={{ marginTop: 6, color: '#fda4af', fontSize: 11 }}>{error}</div>}
      </div>
      {confirmFinish ? (
        <div>
          <div style={{ marginBottom: 8, color: '#cbd5e1', fontSize: 13 }}>Finish this session and save its focus time? This cannot be undone.</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" onClick={() => setConfirmFinish(false)} style={{ flex: 1, border: '1px solid #334155', borderRadius: 10, padding: '10px 12px', background: '#111827', color: '#e2e8f0', cursor: 'pointer' }}>Keep focusing</button>
            <button type="button" onClick={() => void handleFinish()} style={{ flex: 1, border: 0, borderRadius: 10, padding: '10px 12px', background: '#f43f5e', color: '#fff1f2', fontWeight: 700, cursor: 'pointer' }}>Finish session</button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" onClick={() => void handleTogglePause()} style={{ flex: 1, border: 0, borderRadius: 10, padding: '10px 12px', background: '#10b981', color: '#052e25', fontWeight: 700, cursor: 'pointer' }}>{isPaused ? 'Resume' : 'Pause'}</button>
          <button type="button" onClick={() => setConfirmFinish(true)} style={{ border: '1px solid #334155', borderRadius: 10, padding: '10px 12px', background: '#111827', color: '#e2e8f0', cursor: 'pointer' }}>Finish</button>
        </div>
      )}
    </main>,
    floatingWindow.document.body,
  )
}
