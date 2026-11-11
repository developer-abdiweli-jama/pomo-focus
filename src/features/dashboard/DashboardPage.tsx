import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BookOpen, ChevronRight, Clock3, Target } from 'lucide-react'
import { format } from 'date-fns'
import { useGoalStore } from '../goals/goal.store'
import { useRewardStore } from '../rewards/reward.store'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import { ProgressBar } from '../../components/ui/ProgressBar'
import { Dialog } from '../../components/ui/Dialog'
import { getSettings, DEFAULT_USER_SETTINGS } from '../../db/repositories/settingsRepository'
import { getDailyGoals } from '../../db/repositories/goalRepository'
import { getReview, saveDailyReview } from '../../db/repositories/reviewRepository'
import { countDistractionsForRange } from '../../db/repositories/distractionRepository'
import { getActiveSession, getSessionsForRange } from '../../db/repositories/sessionRepository'
import { getDailyGoalById } from '../../db/repositories/goalRepository'
import { useTimerStore } from '../timer/timer.store'
import type { FocusSession } from '../../domain/models'

function formatTime(seconds: number) {
  const minutes = Math.floor(seconds / 60)
  const remainder = seconds % 60
  return `${minutes}:${remainder.toString().padStart(2, '0')}`
}

export function DashboardPage() {
  const navigate = useNavigate()
  const monthlyMissions = useGoalStore((state) => state.monthlyMissions)
  const dailyGoals = useGoalStore((state) => state.dailyGoals)
  const subgoals = useGoalStore((state) => state.subgoals)
  const selectedDailyGoal = useGoalStore((state) => state.selectedDailyGoal)
  const isLoading = useGoalStore((state) => state.isLoading)
  const currentStreak = useRewardStore((state) => state.currentStreak)
  const totalFocusMinutes = useRewardStore((state) => state.totalFocusMinutes)
  const refreshMetrics = useRewardStore((state) => state.refreshMetrics)
  const activeBreak = useTimerStore((state) => state.activeBreak)
  const [activeSession, setActiveSession] = useState<FocusSession | null>(null)
  const [activeSessionGoal, setActiveSessionGoal] = useState('')
  const [clockNow, setClockNow] = useState(Date.now())
  const [dailyTarget, setDailyTarget] = useState(DEFAULT_USER_SETTINGS.dailyFocusTarget)
  const [allDailyGoals, setAllDailyGoals] = useState(dailyGoals)
  const [dailyReflection, setDailyReflection] = useState('')
  const [dailyReviewOpen, setDailyReviewOpen] = useState(false)
  const [dailyReviewError, setDailyReviewError] = useState('')

  useEffect(() => {
    const today = format(new Date(), 'yyyy-MM-dd')
    void refreshMetrics(today, today)
    void Promise.all([getDailyGoals(), getSettings(), getReview(today), getActiveSession()])
      .then(([goals, settings, review, session]) => {
        setAllDailyGoals(goals)
        setDailyTarget(settings?.dailyFocusTarget ?? DEFAULT_USER_SETTINGS.dailyFocusTarget)
        setDailyReflection(review?.reflection ?? '')
        setActiveSession(session)
        if (session) {
          void getDailyGoalById(session.dailyGoalId).then((sessionGoal) => {
            setActiveSessionGoal(sessionGoal?.title ?? 'Focus session')
          })
        }
      })
      .catch(() => setAllDailyGoals([]))
  }, [refreshMetrics])

  useEffect(() => {
    if (!activeBreak && !activeSession) return
    const interval = window.setInterval(() => setClockNow(Date.now()), 1000)
    return () => window.clearInterval(interval)
  }, [activeBreak, activeSession])

  const mission = monthlyMissions[0]
  const goal = selectedDailyGoal ?? dailyGoals[0]
  const goalSubgoals = goal
    ? subgoals.filter((subgoal) => subgoal.dailyGoalId === goal.id)
    : []
  const completedSubgoals = goalSubgoals.filter((subgoal) => subgoal.status === 'completed').length
  const missionGoals = mission
    ? allDailyGoals.filter((dailyGoal) => dailyGoal.monthlyMissionId === mission.id)
    : []
  const missionProgress = mission?.status === 'completed'
    ? 100
    : missionGoals.length > 0
      ? Math.round((missionGoals.filter((dailyGoal) => dailyGoal.status === 'completed').length / missionGoals.length) * 100)
      : 0
  const sessionRemainingMs = activeSession
    ? Math.max(0, activeSession.plannedEndAt - (activeSession.pausedAt ?? clockNow))
    : 0
  const sessionProgress = activeSession
    ? Math.min(100, Math.max(0, (1 - sessionRemainingMs / (activeSession.plannedDuration * 60_000)) * 100))
    : 0
  const breakRemaining = activeBreak
    ? Math.max(0, Math.ceil((activeBreak.endAt - clockNow) / 1000))
    : 0
  const breakProgress = activeBreak
    ? Math.min(100, Math.max(0, (1 - (activeBreak.endAt - clockNow) / (activeBreak.duration * 60_000)) * 100))
    : 0

  const handleStartFocus = () => {
    if (!goal) {
      navigate('/goals')
      return
    }
    navigate(`/focus?goalId=${goal.id}`)
  }

  const handleSaveDailyReview = async () => {
    const reflection = dailyReflection.trim()
    if (!reflection) return
    setDailyReviewError('')
    const today = format(new Date(), 'yyyy-MM-dd')
    try {
      const [sessions, distractionCount] = await Promise.all([
        getSessionsForRange(today, today),
        countDistractionsForRange(today, today),
      ])
      const focusMinutes = sessions
        .filter((session) => session.status === 'completed')
        .reduce((sum, session) => sum + (session.actualDuration ?? 0), 0)
      await saveDailyReview({
        date: today,
        reflection,
        completedGoal: goal?.status === 'completed',
        focusMinutes,
        distractionCount,
      })
      await refreshMetrics(today, today)
      setDailyReviewOpen(false)
    } catch (err) {
      setDailyReviewError(err instanceof Error ? err.message : 'Could not save daily review')
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <header className="mb-7">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-400/80">
          {format(new Date(), 'EEEE, MMMM d, yyyy')}
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          What matters today?
        </h1>
        <p className="mt-2 text-sm text-slate-400">
          Choose one task, then give it your attention.
        </p>
      </header>

      {(activeBreak || activeSession) && (
        <Card className="mb-4 border-sky-400/25 bg-linear-to-br from-sky-500/10 via-slate-900/90 to-slate-900 p-5 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0 flex-1">
              <div className="mb-2 flex items-center gap-2 text-sm font-medium text-sky-300">
                <Clock3 size={17} />
                <span>{activeBreak ? 'Break in progress' : activeSession?.pausedAt ? 'Focus session paused' : 'Focus session in progress'}</span>
              </div>
              <h2 className="break-words text-xl font-semibold text-white">
                {activeBreak ? 'Take a moment to reset' : activeSessionGoal || 'Focus session'}
              </h2>
              <p className="mt-1 text-sm text-slate-400">
                {activeBreak
                  ? breakRemaining > 0 ? `${formatTime(breakRemaining)} remaining` : 'Break time is up. Return when you’re ready.'
                  : activeSession?.pausedAt ? `${formatTime(Math.ceil(sessionRemainingMs / 1000))} left · paused` : `${formatTime(Math.ceil(sessionRemainingMs / 1000))} remaining`}
              </p>
              <div className="mt-3 max-w-xl">
                <ProgressBar value={activeBreak ? breakProgress : sessionProgress} />
              </div>
              {!activeBreak && activeSession && (
                <p className="mt-2 text-xs text-slate-500">{Math.round(sessionProgress)}% of {activeSession.plannedDuration} minutes</p>
              )}
            </div>
            <Button
              className="shrink-0"
              onClick={() => navigate(activeBreak ? `/focus?break=1${activeSession ? `&goalId=${activeSession.dailyGoalId}` : ''}` : `/focus?goalId=${activeSession?.dailyGoalId ?? ''}`)}
            >
              {activeBreak ? 'Return to break' : 'Open session'}
            </Button>
          </div>
        </Card>
      )}

      <Card className="border-emerald-400/20 bg-linear-to-br from-emerald-500/10 via-slate-900/90 to-slate-900 p-6 sm:p-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <div className="mb-3 flex items-center gap-2 text-sm font-medium text-emerald-400">
              <Target size={17} />
              <span>Today&apos;s main goal</span>
            </div>
            {goal ? (
              <>
                <h2 className="break-words text-2xl font-semibold text-white sm:text-3xl">
                  {goal.title}
                </h2>
                {goal.isCarryOver && (
                  <p className="mt-2 text-xs text-slate-400">Carried over from a previous day</p>
                )}
                <p className="mt-3 text-sm text-slate-400">
                  {goal.status === 'completed' ? 'Completed for today' : goal.status.replace(/_/g, ' ')}
                </p>
              </>
            ) : (
              <>
                <h2 className="text-2xl font-semibold text-white">Choose one task to begin</h2>
                <p className="mt-2 max-w-md text-sm leading-6 text-slate-400">
                  A clear goal makes it easier to start your first focus session.
                </p>
              </>
            )}
          </div>

          <div className="flex shrink-0 flex-col gap-2 sm:items-stretch">
            <Button onClick={handleStartFocus} disabled={isLoading}>
              {goal ? 'Start focus' : 'Create today’s goal'}
            </Button>
            {goal && (
              <Button variant="secondary" onClick={() => navigate('/goals')} disabled={isLoading}>
                Edit goal
              </Button>
            )}
          </div>
        </div>

        {goal && goalSubgoals.length > 0 && (
          <details className="mt-7 border-t border-slate-700/60 pt-4">
            <summary className="cursor-pointer list-none text-sm text-slate-400 marker:hidden">
              Subgoals <span className="ml-1 text-slate-500">{completedSubgoals}/{goalSubgoals.length} complete</span>
            </summary>
            <ul className="mt-3 space-y-2">
              {goalSubgoals.map((subgoal) => (
                <li key={subgoal.id} className="flex items-center gap-3 text-sm text-slate-300">
                  <span
                    aria-hidden="true"
                    className={`h-2 w-2 shrink-0 rounded-full ${subgoal.status === 'completed' ? 'bg-emerald-400' : 'bg-slate-600'}`}
                  />
                  <span className={subgoal.status === 'completed' ? 'text-slate-500 line-through' : ''}>
                    {subgoal.title}
                  </span>
                </li>
              ))}
            </ul>
          </details>
        )}
      </Card>

      <details className="mt-4 rounded-xl border border-slate-700/50 bg-slate-900/50 px-5 py-4">
        <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-medium text-slate-300 marker:hidden">
          <Clock3 size={16} className="text-sky-400" />
          Today&apos;s progress and reflection
        </summary>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-slate-700/40 bg-slate-800/40 p-4">
            <p className="text-xs text-slate-500">Focus time</p>
            <p className="mt-2 text-xl font-semibold text-white">{totalFocusMinutes}m</p>
          </div>
          <div className="rounded-lg border border-slate-700/40 bg-slate-800/40 p-4">
            <p className="text-xs text-slate-500">Daily target</p>
            <p className="mt-2 text-xl font-semibold text-white">{dailyTarget}m</p>
            <div className="mt-3">
              <ProgressBar value={Math.min(100, Math.round((totalFocusMinutes / dailyTarget) * 100))} />
            </div>
          </div>
          <div className="rounded-lg border border-slate-700/40 bg-slate-800/40 p-4">
            <p className="text-xs text-slate-500">Current streak</p>
            <p className="mt-2 text-xl font-semibold text-white">{currentStreak} days</p>
          </div>
        </div>

        {mission && (
          <div className="mt-4 rounded-lg border border-emerald-400/15 bg-emerald-500/[0.06] p-4">
            <div className="mb-2 flex items-center justify-between gap-3 text-sm">
              <span className="font-medium text-emerald-300">Monthly mission · {mission.title}</span>
              <span className="shrink-0 text-emerald-400/80">{missionProgress}%</span>
            </div>
            <ProgressBar value={missionProgress} />
          </div>
        )}

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-700/50 pt-4">
          <div className="text-sm text-slate-400">
            <BookOpen size={15} className="mr-2 inline text-violet-300" />
            {dailyReflection ? 'Today’s reflection is saved.' : 'Take a moment to reflect on today.'}
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => navigate('/review')} className="px-2">
              Weekly review <ChevronRight size={15} className="ml-1" />
            </Button>
            <Button variant="secondary" onClick={() => setDailyReviewOpen(true)}>
              {dailyReflection ? 'Edit reflection' : 'Write reflection'}
            </Button>
          </div>
        </div>
      </details>

      {isLoading && <p className="mt-4 text-sm text-slate-500">Loading your goals…</p>}

      <Dialog
        open={dailyReviewOpen}
        onClose={() => setDailyReviewOpen(false)}
        title="Daily reflection"
        description="What helped you focus today? What would you like to adjust tomorrow?"
        size="md"
      >
        <textarea
          value={dailyReflection}
          onChange={(event) => setDailyReflection(event.target.value)}
          rows={5}
          placeholder="Write an honest note about today…"
          className="mb-4 w-full rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
        {dailyReviewError && <p role="alert" className="mb-3 text-sm text-rose-300">{dailyReviewError}</p>}
        <div className="flex justify-end">
          <Button onClick={() => void handleSaveDailyReview()} disabled={!dailyReflection.trim()}>
            Save reflection
          </Button>
        </div>
      </Dialog>
    </div>
  )
}
