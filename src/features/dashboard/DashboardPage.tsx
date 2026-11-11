import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Clock3, Target, ChevronRight, BookOpen } from 'lucide-react'
import { useGoalStore } from '../goals/goal.store'
import { useRewardStore } from '../rewards/reward.store'
import { format } from 'date-fns'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import { ProgressBar } from '../../components/ui/ProgressBar'
import { getSettings, DEFAULT_USER_SETTINGS } from '../../db/repositories/settingsRepository'
import { getDailyGoals } from '../../db/repositories/goalRepository'
import { getReview, saveDailyReview } from '../../db/repositories/reviewRepository'
import { countDistractionsForRange } from '../../db/repositories/distractionRepository'
import { getSessionsForRange } from '../../db/repositories/sessionRepository'
import { Dialog } from '../../components/ui/Dialog'

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
  const [dailyTarget, setDailyTarget] = useState(DEFAULT_USER_SETTINGS.dailyFocusTarget)
  const [allDailyGoals, setAllDailyGoals] = useState(dailyGoals)
  const [dailyReflection, setDailyReflection] = useState('')
  const [dailyReviewOpen, setDailyReviewOpen] = useState(false)
  const [dailyReviewError, setDailyReviewError] = useState('')
  useEffect(() => {
    const today = format(new Date(), 'yyyy-MM-dd')
    void refreshMetrics(today, today)
    void Promise.all([getDailyGoals(), getSettings(), getReview(today)]).then(([goals, settings, review]) => {
      setAllDailyGoals(goals)
      setDailyTarget(settings?.dailyFocusTarget ?? DEFAULT_USER_SETTINGS.dailyFocusTarget)
      setDailyReflection(review?.reflection ?? '')
    }).catch(() => {
      setAllDailyGoals([])
    })
  }, [refreshMetrics])
  const mission = monthlyMissions[0]
  const goal = selectedDailyGoal ?? dailyGoals[0]
  const goalSubgoals = goal
    ? subgoals.filter((subgoal) => subgoal.dailyGoalId === goal.id)
    : []
  const missionGoals = mission
    ? allDailyGoals.filter((dailyGoal) => dailyGoal.monthlyMissionId === mission.id)
    : []
  const missionProgress = mission?.status === 'completed'
    ? 100
    : missionGoals.length > 0
      ? Math.round((missionGoals.filter((dailyGoal) => dailyGoal.status === 'completed').length / missionGoals.length) * 100)
      : 0

  const handleCreateGoal = () => {
    navigate('/goals')
  }

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
    <>
      <section className="mb-8 flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-400/80">
            {format(new Date(), 'EEEE, MMMM d, yyyy')}
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            Build a focused day.
          </h1>
          <p className="mt-3 max-w-xl text-[15px] leading-7 text-slate-400">
            One clear goal, honest sessions, and steady progress toward your
            bigger mission.
          </p>
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-amber-500/20 bg-amber-500/[0.07] px-4 py-3 text-sm text-amber-200">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-400/10 text-lg">
            {currentStreak}
          </span>
          <span>
            <strong className="font-semibold text-amber-100">day streak</strong>{' '}
            <span className="ml-1 text-amber-200/60">so far</span>
          </span>
        </div>
      </section>

      <Card className="mt-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm font-medium text-violet-300">
              <BookOpen size={16} /> Daily review
            </div>
            <p className="text-sm text-slate-400">
              {dailyReflection ? 'Your reflection for today is saved.' : 'Record an honest note about today to support your streak.'}
            </p>
          </div>
          <Button variant="secondary" onClick={() => setDailyReviewOpen(true)}>
            {dailyReflection ? 'Edit today’s review' : 'Write today’s review'}
          </Button>
        </div>
      </Card>

      <Dialog open={dailyReviewOpen} onClose={() => setDailyReviewOpen(false)} title="Daily review">
        <p className="mb-4 text-sm text-slate-300">What did you focus on today? What went well, and what would you change tomorrow?</p>
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
            Save today’s review
          </Button>
        </div>
      </Dialog>

      <section className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <Card className="border-emerald-400/20 bg-linear-to-br from-emerald-500/12 via-slate-900/90 to-slate-900">
          <div className="mb-8 flex items-start justify-between gap-4">
            <div>
              <div className="mb-3 flex items-center gap-2 text-sm font-medium text-emerald-400">
                <Target size={17} />
                <span>Today&apos;s main goal</span>
              </div>
              {goal ? (
                <>
                  <h2 className="text-2xl font-semibold text-white">
                    {goal.title}
                  </h2>
                  {goal.isCarryOver && (
                    <p className="mt-1 text-xs text-emerald-300/70">
                      Carried over from a previous day
                    </p>
                  )}
                </>
              ) : (
                <>
                  <h2 className="text-2xl font-semibold text-white">
                    Decide what deserves your focus
                  </h2>
                  <p className="mt-2 max-w-lg text-sm leading-6 text-slate-400">
                    Your first goal will guide the sessions and subgoals you
                    create for today.
                  </p>
                </>
              )}
              <span className={`rounded-full border px-3 py-1 text-xs ${
                goal?.status === 'completed'
                  ? 'border-emerald-500 bg-emerald-500/20 text-emerald-300'
                  : goal?.status === 'in_progress'
                    ? 'border-sky-500 bg-sky-500/20 text-sky-300'
                    : 'border-slate-700/80 bg-slate-950/40 text-slate-400'
              }`}>
                {goal?.status.replace(/_/g, ' ') ?? 'Not started'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {goal ? (
                <Button
                  variant="secondary"
                  onClick={() => navigate('/goals')}
                  disabled={isLoading}
                >
                  Edit goal
                </Button>
              ) : (
                <Button
                  onClick={handleCreateGoal}
                  disabled={isLoading}
                >
                  Create today&apos;s goal
                </Button>
              )}
              <Button
                onClick={handleStartFocus}
                disabled={!goal || isLoading}
              >
                Start focus session
              </Button>
            </div>
          </div>

          {goal && (
            <div className="mb-6">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-medium text-emerald-300">Subgoals</p>
                <span className="text-xs text-emerald-400/70">
                  {goalSubgoals.filter((s) => s.status === 'completed').length}/{goalSubgoals.length}
                </span>
              </div>
              <div className="space-y-2">
                {goalSubgoals.length > 0 ? (
                  goalSubgoals.map((subgoal) => (
                    <label
                      key={subgoal.id}
                      className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm border border-slate-700/60 bg-slate-950/50 transition-colors hover:border-emerald-500/40 cursor-pointer select-none"
                    >
                      <input
                        type="checkbox"
                        checked={subgoal.status === 'completed'}
                        onChange={() => {
                          // toggled via goal store in GoalPage; here read-only display
                        }}
                        readOnly
                        className="shrink-0 rounded text-emerald-400 accent-emerald-500"
                      />
                      <span
                        className={`text-sm ${
                          subgoal.status === 'completed'
                            ? 'text-emerald-400 line-through'
                            : 'text-slate-400'
                        }`}
                      >
                        {subgoal.title}
                      </span>
                    </label>
                  ))
                ) : (
                  <p className="text-sm text-slate-500">
                    No subgoals yet. Add them in the goal view.
                  </p>
                )}
              </div>
            </div>
          )}

          {!goal && (
            <div className="mb-6 rounded-xl border border-dashed border-slate-700/80 bg-slate-950/40 p-4 transition-colors hover:border-emerald-500/30">
              <p className="text-sm text-slate-500">No goal created yet</p>
              <p className="mt-1 text-sm text-slate-300">
                A specific goal will make your first focus session easier to
                start.
              </p>
            </div>
          )}
        </Card>

        <Card>
          <div className="mb-6 flex items-center gap-2 text-sm font-medium text-slate-300">
            <Clock3 size={17} className="text-sky-400" />
            <span>Focus summary</span>
          </div>

          <div className="grid gap-3">
            <div className="rounded-xl border border-slate-700/40 bg-slate-800/45 p-4">
              <p className="text-xs text-slate-500">Focus time today</p>
              <p className="mt-2 text-2xl font-semibold text-white">
                {totalFocusMinutes}m
              </p>
            </div>
            <div className="rounded-xl border border-slate-700/40 bg-slate-800/45 p-4">
              <p className="text-xs text-slate-500">Daily target</p>
              <p className="mt-2 text-2xl font-semibold text-white">{dailyTarget}m</p>
              <div className="mt-3">
                <ProgressBar
                  value={Math.min(100, Math.round((totalFocusMinutes / dailyTarget) * 100))}
                />
              </div>
            </div>
            <div className="rounded-xl border border-slate-700/40 bg-slate-800/45 p-4">
              <p className="text-xs text-slate-500">Current streak</p>
              <p className="mt-2 text-2xl font-semibold text-white">
                {currentStreak} days
              </p>
            </div>
          </div>

          {mission && (
            <div className="mt-6 rounded-xl border border-emerald-400/20 bg-emerald-500/10 p-4">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm font-medium text-emerald-300">
                  Monthly mission
                </p>
                <span className="text-xs text-emerald-400/70">{missionProgress}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                <div className="h-full rounded-full bg-emerald-400" style={{ width: `${missionProgress}%` }} />
              </div>
              <p className="mt-2 text-xs text-emerald-300/70">
                {mission.title}
              </p>
            </div>
          )}

          <div className="mt-6 flex items-center justify-between gap-3">
            <p className="text-sm text-slate-500">{mission ? 'Mission progress' : 'No monthly mission yet'}</p>
            <Button
              variant="ghost"
              onClick={() => navigate('/goals')}
              className="px-2"
            >
              Add mission <ChevronRight size={15} className="ml-2" />
            </Button>
          </div>
        </Card>
      </section>

      {isLoading && (
        <p className="mt-6 text-sm text-slate-500">Loading…</p>
      )}
    </>
  )
}
