import { useEffect, useRef, useState, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Play, Pause, SkipForward, PhoneOff, Flag, X, Clock } from 'lucide-react'
import { useTimerStore } from './timer.store'
import { useGoalStore } from '../goals/goal.store'
import {
  createFocusSession,
  endSession,
  extendSession,
  getActiveSession,
  pauseSession,
  resumeSession,
} from '../../db/repositories/sessionRepository'
import { saveDistraction } from '../../db/repositories/distractionRepository'
import { getSettings, DEFAULT_USER_SETTINGS } from '../../db/repositories/settingsRepository'
import { getDailyGoalByDate } from '../../db/repositories/goalRepository'
import { format } from 'date-fns'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import { Dialog } from '../../components/ui/Dialog'
import { ProgressBar } from '../../components/ui/ProgressBar'

const DEFAULT_DURATION_MINUTES = 50
const DEFAULT_BREAK_DURATION_MINUTES = 10

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function FocusPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const goalIdParam = searchParams.get('goalId')
  const goalId = goalIdParam ? Number(goalIdParam) : null

  const isRunning = useTimerStore((state) => state.isRunning)
  const isPaused = useTimerStore((state) => state.isPaused)
  const plannedEndAt = useTimerStore((state) => state.plannedEndAt)
  const plannedDuration = useTimerStore((state) => state.plannedDuration)
  const sessionId = useTimerStore((state) => state.sessionId)
  const activeBreak = useTimerStore((state) => state.activeBreak)
  const start = useTimerStore((state) => state.start)
  const pause = useTimerStore((state) => state.pause)
  const resume = useTimerStore((state) => state.resume)
  const reset = useTimerStore((state) => state.reset)
  const restore = useTimerStore((state) => state.restore)
  const extend = useTimerStore((state) => state.extend)
  const startBreak = useTimerStore((state) => state.startBreak)
  const clearBreak = useTimerStore((state) => state.clearBreak)

  const createDailyGoal = useGoalStore((state) => state.createDailyGoal)
  const subgoals = useGoalStore((state) => state.subgoals)
  const selectedDailyGoal = useGoalStore((state) => state.selectedDailyGoal)

  const [sessionEnded, setSessionEnded] = useState(false)
  const [distractionOpen, setDistractionOpen] = useState(false)
  const [distractionNote, setDistractionNote] = useState('')
  const [breakOpen, setBreakOpen] = useState(false)
  const [secondsLeft, setSecondsLeft] = useState(0)
  const [focusDuration, setFocusDuration] = useState(DEFAULT_DURATION_MINUTES)
  const [breakDuration, setBreakDuration] = useState(DEFAULT_BREAK_DURATION_MINUTES)
  const [breakSeconds, setBreakSeconds] = useState(0)
  const [selectedSubgoalId, setSelectedSubgoalId] = useState<number | null>(null)
  const [soundEnabled, setSoundEnabled] = useState(DEFAULT_USER_SETTINGS.soundEnabled)
  const [error, setError] = useState('')

  const frameRef = useRef<number | null>(null)

  const playTone = useCallback(() => {
    if (!soundEnabled || typeof window.AudioContext === 'undefined') return
    const context = new AudioContext()
    const oscillator = context.createOscillator()
    const gain = context.createGain()
    oscillator.frequency.value = 660
    gain.gain.setValueAtTime(0.0001, context.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.08, context.currentTime + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.35)
    oscillator.connect(gain)
    gain.connect(context.destination)
    oscillator.start()
    oscillator.stop(context.currentTime + 0.36)
    oscillator.onended = () => { void context.close() }
  }, [soundEnabled])

  const persistPause = useCallback(async () => {
    const pausedAt = Date.now()
    pause(pausedAt)
    if (sessionId !== null) {
      try {
        await pauseSession(sessionId, pausedAt)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not save paused session')
      }
    }
  }, [pause, sessionId])

  const persistResume = useCallback(async () => {
    const resumedAt = Date.now()
    if (sessionId !== null) {
      try {
        await resumeSession(sessionId, resumedAt)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not resume session')
        return
      }
    }
    resume(resumedAt)
  }, [resume, sessionId])

  const handleSessionEnd = useCallback(() => {
    if (!isRunning) return
    void persistPause()
    playTone()
    setSessionEnded(true)
  }, [isRunning, persistPause, playTone])

  // Recompute remaining time on every animation frame while running.
  useEffect(() => {
    if (!isRunning || !plannedEndAt) return
    const step = () => {
      const now = Date.now()
      const remaining = plannedEndAt - now
      if (remaining <= 0) {
        setSecondsLeft(0)
        handleSessionEnd()
        return
      }
      setSecondsLeft(Math.ceil(remaining / 1000))
      frameRef.current = requestAnimationFrame(step)
    }
    frameRef.current = requestAnimationFrame(step)
    return () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current)
    }
  }, [isRunning, plannedEndAt, handleSessionEnd])

  useEffect(() => {
    let cancelled = false
    void Promise.all([getActiveSession(), getSettings()]).then(([activeSession, settings]) => {
      if (cancelled) return
      setBreakDuration(settings?.breakDuration ?? DEFAULT_USER_SETTINGS.breakDuration)
      setFocusDuration(settings?.focusDuration ?? DEFAULT_USER_SETTINGS.focusDuration)
      setSoundEnabled(settings?.soundEnabled ?? DEFAULT_USER_SETTINGS.soundEnabled)
      if (activeSession) {
        if (useTimerStore.getState().sessionId === null) restore(activeSession)
        setSelectedSubgoalId(activeSession.subgoalId)
        setSecondsLeft(Math.max(0, Math.ceil((activeSession.plannedEndAt - (activeSession.pausedAt ?? Date.now())) / 1000)))
        if (!useTimerStore.getState().activeBreak && activeSession.pausedAt !== null && activeSession.plannedEndAt <= activeSession.pausedAt) {
          setSessionEnded(true)
        }
      }
    }).catch((err: unknown) => {
      if (!cancelled) setError(err instanceof Error ? err.message : 'Could not restore session')
    })
    return () => { cancelled = true }
  }, [restore])

  useEffect(() => {
    if (!activeBreak) {
      setBreakSeconds(0)
      return
    }
    const updateBreak = () => setBreakSeconds(Math.max(0, Math.ceil((activeBreak.endAt - Date.now()) / 1000)))
    updateBreak()
    const timer = window.setInterval(updateBreak, 250)
    return () => window.clearInterval(timer)
  }, [activeBreak])

  useEffect(() => {
    if (activeBreak) {
      setSessionEnded(false)
      setBreakOpen(true)
    }
  }, [activeBreak])

  useEffect(() => {
    return () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current)
    }
  }, [])

  const startSession = useCallback(async () => {
    setError('')
    let active
    let settings
    try {
      ;[active, settings] = await Promise.all([getActiveSession(), getSettings()])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load session settings')
      return
    }
    if (active) {
      restore(active)
      return
    }
    const duration = settings?.focusDuration ?? DEFAULT_USER_SETTINGS.focusDuration
    setFocusDuration(duration)
    const now = Date.now()
    let dailyGoalId = goalId

    if (!dailyGoalId) {
      const today = format(new Date(), 'yyyy-MM-dd')
      try {
        dailyGoalId = await createDailyGoal({
          title: `Focus session ${format(new Date(), 'HH:mm')}`,
          monthlyMissionId: null,
          date: today,
        }).catch(async (err: unknown) => {
          const existing = await getDailyGoalByDate(today)
          if (existing) return existing.id
          throw err
        })
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not create session')
        return
      }
    }

    try {
      const id = await createFocusSession({
        dailyGoalId,
        subgoalId: selectedSubgoalId,
        startedAt: now,
        endedAt: null,
        plannedDuration: duration,
        plannedEndAt: now + duration * 60_000,
        pausedAt: null,
        totalPausedTime: 0,
        actualDuration: null,
        status: 'in_progress',
      })
      start(duration, id, now)
      navigate(`/focus?goalId=${dailyGoalId}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start session')
    }
  }, [goalId, createDailyGoal, start, navigate, restore, selectedSubgoalId])

  // Keyboard shortcuts: Space to start/pause, Escape to close open dialogs.
  // Ignored while typing in an input/textarea.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      const isTyping =
        target?.tagName === 'INPUT' ||
        target?.tagName === 'TEXTAREA' ||
        target?.isContentEditable
      if (event.key === ' ' && !isTyping) {
        event.preventDefault()
        if (sessionId === null) {
          void startSession()
        } else if (isPaused) {
          void persistResume()
        } else if (isRunning) {
          void persistPause()
        }
      }
      if (event.key === 'Escape') {
        if (sessionEnded) setSessionEnded(false)
        if (distractionOpen) setDistractionOpen(false)
        if (breakOpen) setBreakOpen(false)
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [sessionId, isPaused, isRunning, sessionEnded, distractionOpen, breakOpen, startSession, persistPause, persistResume])

  const endCurrentSession = useCallback(async () => {
    if (!sessionId) return
    try {
      await endSession(sessionId, Date.now())
      playTone()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not end session')
      return
    }
    setSessionEnded(false)
    reset()
  }, [sessionId, reset, playTone])

  const handleContinue = async () => {
    if (!sessionId) return
    if (plannedEndAt !== null && Date.now() >= plannedEndAt) {
      try {
        await extendSession(sessionId, focusDuration)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not extend session')
        return
      }
      extend(focusDuration)
    }
    await persistResume()
    setSessionEnded(false)
  }

  const handleBreak = () => {
    startBreak(breakDuration)
    setBreakSeconds(breakDuration * 60)
    setBreakOpen(true)
    setSessionEnded(false)
  }

  const handleFinish = () => {
    endCurrentSession()
  }

  const handleSaveDistraction = async () => {
    if (!sessionId) return
    setError('')
    if (!distractionNote.trim()) {
      setError('Please write a short note about what distracted you.')
      return
    }
    try {
      await saveDistraction({
        sessionId,
        note: distractionNote.trim(),
        occurredAt: Date.now(),
      })
      setDistractionNote('')
      setDistractionOpen(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save distraction')
    }
  }

  const handleFinishBreak = () => {
    setBreakOpen(false)
    clearBreak()
    setBreakSeconds(0)
  }

  const progress =
    plannedDuration > 0
      ? Math.max(
          0,
          Math.min(
            100,
            ((plannedDuration * 60_000 - secondsLeft * 1000) /
              (plannedDuration * 60_000)) *
              100,
          ),
        )
      : 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <Button variant="ghost" onClick={() => navigate('/')}>
          <X size={16} className="mr-2" /> Back to today
        </Button>
        <h1 className="text-2xl font-semibold tracking-tight text-white">Focus session</h1>
      </div>

      {activeBreak && !breakOpen && (
        <Card className="border-sky-400/25 bg-sky-500/5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="min-w-0 flex-1">
              <p className="font-medium text-sky-300">Break is still running · {formatTime(breakSeconds)} left</p>
              <div className="mt-3">
                <ProgressBar value={Math.min(100, Math.max(0, (1 - (activeBreak.endAt - Date.now()) / (activeBreak.duration * 60_000)) * 100))} />
              </div>
            </div>
            <Button variant="secondary" onClick={() => setBreakOpen(true)}>Open break timer</Button>
          </div>
        </Card>
      )}

      {error && (
        <div className="rounded-lg bg-rose-500/10 border border-rose-500/30 p-3 text-xs text-rose-300">
          {error}
        </div>
      )}

      {!isRunning && sessionId === null ? (
        <Card className="text-center py-12">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
            <Clock size={32} />
          </div>
          <h2 className="mt-6 text-xl font-semibold text-white">Ready to focus</h2>
          <p className="mt-3 max-w-xs mx-auto text-sm text-slate-400">
            Start a {focusDuration}-minute session on your current
            goal. The timer survives refreshes and laptop sleep.
          </p>
          <div className="mt-8">
            {subgoals.length > 0 && (
              <div className="mx-auto mb-4 max-w-sm text-left">
                <label htmlFor="focus-subgoal" className="mb-1.5 block text-sm font-medium text-slate-300">Focus subgoal (optional)</label>
                <select
                  id="focus-subgoal"
                  value={selectedSubgoalId ?? ''}
                  onChange={(event) => setSelectedSubgoalId(event.target.value ? Number(event.target.value) : null)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-200"
                >
                  <option value="">Main goal</option>
                  {subgoals.map((subgoal) => <option key={subgoal.id} value={subgoal.id}>{subgoal.title}</option>)}
                </select>
              </div>
            )}
            <Button
              onClick={startSession}
              disabled={isRunning || sessionId !== null}
              className="px-8 py-3"
            >
              <Play size={20} className="mr-2" /> Start focus session
            </Button>
          </div>
        </Card>
      ) : (
        <>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-slate-400">Time remaining</p>
              <p className="text-6xl font-mono font-bold text-white tracking-tighter">
                {formatTime(secondsLeft)}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {plannedDuration}-minute session
              </p>
            </div>
            <div className="flex items-end gap-2">
              <span className="text-4xl font-bold text-emerald-400">{progress.toFixed(0)}%</span>
            </div>
          </div>
          <div className="mt-4">
            <ProgressBar value={progress} />
          </div>

          <div className="mt-8 grid gap-3 lg:grid-cols-3">
            <Button
              onClick={() => { void (isPaused ? persistResume() : persistPause()) }}
              disabled={Boolean(activeBreak) || (!isRunning && sessionId === null)}
              className="px-8 py-3"
            >
              {isPaused ? (
                <>
                  <Play size={20} className="mr-2" /> Resume
                </>
              ) : (
                <>
                  <Pause size={20} className="mr-2" /> Pause
                </>
              )}
            </Button>
            <Button
              variant="secondary"
              onClick={handleSessionEnd}
              disabled={!isRunning}
              className="px-8 py-3"
            >
              <SkipForward size={20} className="mr-2" /> End session
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                if (isRunning) void persistPause()
                setDistractionOpen(true)
              }}
              disabled={Boolean(activeBreak)}
              className="px-8 py-3 border-rose-500/30 text-rose-400 hover:bg-rose-500/10 hover:text-rose-300"
            >
              <PhoneOff size={20} className="mr-2" /> I got distracted
            </Button>
          </div>

          <div className="mt-8 rounded-xl border border-slate-800 bg-slate-900/60 p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Session</p>
              <span className="text-xs text-slate-400">{sessionId !== null ? `#${sessionId}` : '—'}</span>
            </div>
              <p className="mb-1 text-sm font-medium text-white">
                {selectedDailyGoal?.title ?? 'Personal focus session'}
              </p>
            <p className="text-sm text-slate-300">
              {subgoals.find((subgoal) => subgoal.id === selectedSubgoalId)?.title ?? 'Stay with it. One honest session beats a dozen distracted hours.'}
            </p>
          </div>
        </>
      )}

      {/* Session ended decision (break is not automatic) */}
      <Dialog
        open={sessionEnded}
        onClose={() => setSessionEnded(false)}
        title="Session complete"
        description="The timer has reached zero. Choose what you want to do next; breaks never start automatically."
        size="sm"
      >
        <div className="grid gap-2">
          <Button onClick={handleContinue} className="px-4 py-3">
            <Clock size={18} className="mr-2" /> Continue focusing
          </Button>
          <Button variant="secondary" onClick={handleBreak} className="px-4 py-3">
            <Clock size={18} className="mr-2" /> Take a {breakDuration}-minute break
          </Button>
          <Button variant="ghost" onClick={handleFinish} className="px-4 py-3">
            <Flag size={18} className="mr-2" /> Finish for now
          </Button>
        </div>
      </Dialog>

      {/* Distraction dialog */}
      <Dialog
        open={distractionOpen}
        onClose={() => setDistractionOpen(false)}
        title="Distraction noted"
        description="The timer is paused. Add a short note, then resume when you’re ready."
        size="md"
      >
        <textarea
          value={distractionNote}
          onChange={(e) => setDistractionNote(e.target.value)}
          rows={3}
          placeholder="e.g. Checked phone, got stuck on a bug"
          className="rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 w-full mb-4"
        />
        {error && <p className="text-xs text-rose-400 mb-4">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button variant="ghost" type="button" onClick={() => setDistractionOpen(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSaveDistraction}
            disabled={!distractionNote.trim()}
          >
            Save note
          </Button>
        </div>
      </Dialog>

      {/* Break dialog */}
      <Dialog
        open={breakOpen}
        onClose={() => setBreakOpen(false)}
        title="Break time"
        description="Closing this window keeps the break running. End it when you’re ready to return to focus."
        size="sm"
      >
        <p className="text-sm text-slate-300 mb-4">
          {breakSeconds > 0
            ? `Take a break. ${formatTime(breakSeconds)} remaining.`
            : 'Your break time is up. End the break when you’re ready to return to focus.'}
        </p>
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="ghost" onClick={() => setBreakOpen(false)}>Keep break running</Button>
          <Button onClick={handleFinishBreak}>{breakSeconds > 0 ? 'End break and return' : 'Finish break'}</Button>
        </div>
      </Dialog>
    </div>
  )
}
