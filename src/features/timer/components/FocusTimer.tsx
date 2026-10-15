import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Maximize2, Pause, Play, ShieldAlert } from 'lucide-react'
import Dialog from '../../../components/ui/Dialog'
import Button from '../../../components/ui/Button'
import { recordDistraction } from '../../../db/repositories/distractionRepository'
import {
  cancelFocusSession,
  completeFocusSession,
  pauseFocusSession,
  resumeFocusSession,
  startFocusSession,
} from '../../../db/repositories/sessionRepository'
import type { DailyGoal, FocusSession, Subgoal, UserSettings } from '../../../domain/models'
import { formatDuration, getRemainingSeconds } from '../timer.logic'

type FocusTimerProps = {
  goal: DailyGoal
  subgoals: Subgoal[]
  onClose: () => void
  existingSession?: FocusSession
  initiallyMinimized?: boolean
  settings: UserSettings
}

type TimerState =
  | 'loading'
  | 'running'
  | 'paused'
  | 'completed'
  | 'break'
  | 'break_completed'
  | 'error'

const inputClasses =
  'w-full rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2.5 text-sm text-slate-100 outline-none placeholder:text-slate-600 focus:border-emerald-400'

function FocusTimer({
  goal,
  subgoals,
  onClose,
  existingSession,
  initiallyMinimized = false,
  settings,
}: FocusTimerProps) {
  const [session, setSession] = useState<FocusSession | null>(existingSession ?? null)
  const [remainingSeconds, setRemainingSeconds] = useState(() => existingSession
    ? getSessionRemaining(existingSession)
    : settings.focusDurationSeconds)
  const [timerState, setTimerState] = useState<TimerState>(() => existingSession
    ? existingSession.status === 'running' ? 'running' : 'paused'
    : 'loading')
  const [distractionNote, setDistractionNote] = useState('')
  const [isDistractionOpen, setIsDistractionOpen] = useState(false)
  const [isMinimized, setIsMinimized] = useState(initiallyMinimized)
  const [breakRemainingSeconds, setBreakRemainingSeconds] = useState(settings.breakDurationSeconds)
  const [error, setError] = useState('')
  const hasStarted = useRef(Boolean(existingSession))
  const hasCompleted = useRef(false)

  useEffect(() => {
    if (hasStarted.current) return
    hasStarted.current = true

    void startFocusSession({
      dailyGoalId: goal.id,
      subgoalId: subgoals.find((subgoal) => subgoal.status === 'planned')?.id,
      plannedDurationSeconds: settings.focusDurationSeconds,
    }).then((createdSession) => {
      setSession(createdSession)
      setRemainingSeconds(getSessionRemaining(createdSession))
      setTimerState('running')
    }).catch(() => {
      setError('The focus session could not be started.')
      setTimerState('error')
    })
  }, [goal.id, settings.focusDurationSeconds, subgoals])

  useEffect(() => {
    if (timerState !== 'running' || !session) return undefined

    const interval = window.setInterval(() => {
      const nextRemaining = getRemainingSeconds(session.plannedEndAt)
      setRemainingSeconds(nextRemaining)

      if (nextRemaining === 0 && !hasCompleted.current) {
        hasCompleted.current = true
        void completeFocusSession(session.id, session.plannedDurationSeconds)
          .then(() => setTimerState('completed'))
          .catch(() => setError('The completed session could not be saved.'))
      }
    }, 250)

    return () => window.clearInterval(interval)
  }, [session, timerState])

  useEffect(() => {
    if (timerState !== 'break') return undefined

    const interval = window.setInterval(() => {
      setBreakRemainingSeconds((current) => {
        if (current <= 1) {
          setTimerState('break_completed')
          return 0
        }

        return current - 1
      })
    }, 1000)

    return () => window.clearInterval(interval)
  }, [timerState])

  async function handlePause(): Promise<void> {
    if (!session) return

    try {
      await pauseFocusSession(session.id)
      setSession({ ...session, status: 'paused', pausedAt: new Date().toISOString() })
      setTimerState('paused')
    } catch {
      setError('The session could not be paused. Try again.')
    }
  }

  async function handleResume(): Promise<void> {
    if (!session) return

    try {
      const resumedSession = await resumeFocusSession(session.id)
      setSession(resumedSession)
      setRemainingSeconds(getRemainingSeconds(resumedSession.plannedEndAt))
      setTimerState('running')
    } catch {
      setError('The session could not be resumed. Try again.')
    }
  }

  async function handleCancel(): Promise<void> {
    if (session && (timerState === 'running' || timerState === 'paused')) {
      await cancelFocusSession(session.id)
    }
    onClose()
  }

  async function handleOpenDistraction(): Promise<void> {
    if (timerState === 'running') {
      await handlePause()
    }
    setIsDistractionOpen(true)
  }

  async function handleDistraction(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    if (!session || !distractionNote.trim()) return

    try {
      await recordDistraction(session.id, distractionNote)
      setDistractionNote('')
      setIsDistractionOpen(false)
      await handleResume()
    } catch {
      setError('The distraction could not be saved. Try again.')
    }
  }

  async function startNextFocusSession(): Promise<void> {
    try {
      const nextSession = await startFocusSession({
        dailyGoalId: goal.id,
        subgoalId: subgoals.find((subgoal) => subgoal.status === 'planned')?.id,
        plannedDurationSeconds: settings.focusDurationSeconds,
      })
      hasCompleted.current = false
      setSession(nextSession)
      setRemainingSeconds(nextSession.plannedDurationSeconds)
      setIsDistractionOpen(false)
      setTimerState('running')
    } catch {
      setError('The next focus session could not be started.')
      setTimerState('error')
    }
  }

  function startBreak(): void {
    setBreakRemainingSeconds(settings.breakDurationSeconds)
    setTimerState('break')
  }

  const progress = session
    ? ((session.plannedDurationSeconds - remainingSeconds) / session.plannedDurationSeconds) * 100
    : 0

  if (isMinimized) {
    return (
      <div className="fixed bottom-5 right-5 z-50 flex items-center gap-3 rounded-2xl border border-emerald-500/30 bg-slate-900/95 px-4 py-3 shadow-2xl shadow-black/40 backdrop-blur">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-300/80">
            {timerState === 'break' || timerState === 'break_completed' ? 'Break time' : 'Focus running'}
          </p>
          <p className="font-mono text-xl font-semibold text-white">
            {formatDuration(timerState === 'break' ? breakRemainingSeconds : remainingSeconds)}
          </p>
        </div>
        <Button
          variant="secondary"
          className="px-3 py-2"
          aria-label="Open focus session"
          onClick={() => setIsMinimized(false)}
        >
          <Maximize2 size={16} />
        </Button>
      </div>
    )
  }

  return (
    <Dialog
      title={timerState === 'completed' ? 'Session complete' : timerState === 'break' || timerState === 'break_completed' ? 'Take a break' : 'Focus session'}
      description={timerState === 'completed' ? 'You kept your promise to this goal. Choose what feels right next.' : timerState === 'break_completed' ? 'Your break is complete. Choose what feels right next.' : goal.title}
      onClose={handleCancel}
      onMinimize={() => setIsMinimized(true)}
      dismissOnBackdrop={false}
    >
      {timerState === 'loading' && <p className="text-sm text-slate-400">Starting your focus session...</p>}

      {timerState === 'error' && (
        <p className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-sm text-rose-200" role="alert">
          {error}
        </p>
      )}

      {(timerState === 'running' || timerState === 'paused') && session && (
        <>
          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.06] p-6 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-300/80">
              {timerState === 'paused' ? 'Paused' : 'Stay with this task'}
            </p>
            <p className="mt-4 font-mono text-6xl font-semibold tracking-tight text-white sm:text-7xl">
              {formatDuration(remainingSeconds)}
            </p>
            <div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-800">
              <div className="h-full rounded-full bg-emerald-400 transition-[width]" style={{ width: `${progress}%` }} />
            </div>
          </div>

          {!isDistractionOpen ? (
            <div className="mt-5 flex flex-wrap justify-center gap-3">
              <Button variant="secondary" onClick={timerState === 'paused' ? handleResume : handlePause}>
                {timerState === 'paused' ? <Play size={16} className="mr-2" /> : <Pause size={16} className="mr-2" />}
                {timerState === 'paused' ? 'Resume' : 'Pause'}
              </Button>
              <Button variant="ghost" onClick={() => void handleOpenDistraction()}>
                <ShieldAlert size={16} className="mr-2" /> I got distracted
              </Button>
              <Button variant="ghost" onClick={handleCancel}>Finish for now</Button>
            </div>
          ) : (
            <form className="mt-5 space-y-3" onSubmit={handleDistraction}>
              <label className="block text-sm font-medium text-slate-300">
                What pulled your attention away?
                <input
                  className={`${inputClasses} mt-2`}
                  value={distractionNote}
                  onChange={(event) => setDistractionNote(event.target.value)}
                  placeholder="Checked my phone, got stuck, felt tired..."
                  autoFocus
                />
              </label>
              <div className="flex justify-end gap-3">
                <Button type="button" variant="ghost" onClick={() => setIsDistractionOpen(false)}>Cancel</Button>
                <Button type="submit">Save and resume</Button>
              </div>
            </form>
          )}
        </>
      )}

      {timerState === 'completed' && (
        <div className="flex flex-wrap justify-center gap-3">
          <Button onClick={startBreak}>Take a break</Button>
          <Button variant="secondary" onClick={startNextFocusSession}>Continue focusing</Button>
          <Button variant="ghost" onClick={onClose}>Finish for now</Button>
        </div>
      )}

      {timerState === 'break' && (
        <div className="space-y-5 text-center">
          <p className="font-mono text-6xl font-semibold tracking-tight text-white sm:text-7xl">
            {formatDuration(breakRemainingSeconds)}
          </p>
          <p className="text-sm text-slate-400">Rest without starting another focus session automatically.</p>
          <Button variant="secondary" onClick={() => setTimerState('break_completed')}>Finish break early</Button>
        </div>
      )}

      {timerState === 'break_completed' && (
        <div className="flex flex-wrap justify-center gap-3">
          <Button onClick={startNextFocusSession}>Start next focus session</Button>
          <Button variant="ghost" onClick={onClose}>Finish for now</Button>
        </div>
      )}
    </Dialog>
  )
}

function getSessionRemaining(session: FocusSession): number {
  const referenceTime = session.status === 'paused' && session.pausedAt
    ? new Date(session.pausedAt)
    : new Date()

  return getRemainingSeconds(session.plannedEndAt, referenceTime)
}

export default FocusTimer
