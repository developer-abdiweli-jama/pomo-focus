import { useLiveQuery } from 'dexie-react-hooks'
import {
  ArrowRight,
  CheckCircle,
  Clock3,
  Link2,
  Pencil,
  Unlink,
  Target,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import AppShell, { type AppPage } from '../components/layout/AppShell'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import GoalDialog, { type GoalDialogMode } from '../features/goals/components/GoalDialog'
import FocusTimer from '../features/timer/components/FocusTimer'
import WeeklyReviewPage from '../features/reviews/WeeklyReviewPage'
import SettingsPage from '../features/settings/SettingsPage'
import { calculateCurrentStreak } from '../features/rewards/streak.logic'
import { db } from '../db/database'
import {
  syncDailyGoalStatus,
  addSubgoal,
  carryGoalForward,
  linkGoalToMission,
  unlinkGoalFromMission,
  toggleSubgoal,
  updateSubgoalTitle,
} from '../db/repositories/goalRepository'
import { defaultSettings, getSettings } from '../db/repositories/settingsRepository'
import type { DailyGoal, FocusSession, MonthlyMission, Subgoal } from '../domain/models'
import { countInclusiveDays, dateKeyWithOffset, formatLongDate, todayDateKey, toDateKey } from '../lib/dates'

const goalStatusLabels = {
  planned: 'Not started',
  in_progress: 'In progress',
  completed: 'Completed',
  carried_over: 'Carried over',
  cancelled: 'Cancelled',
} as const

function App() {
  const today = todayDateKey()
  const tomorrow = dateKeyWithOffset(1)
  const [activePage, setActivePage] = useState<AppPage>('today')
  const [dialogMode, setDialogMode] = useState<GoalDialogMode | null>(null)
  const [missionToEdit, setMissionToEdit] = useState<MonthlyMission | undefined>()
  const [isFocusTimerOpen, setIsFocusTimerOpen] = useState(false)
  const [editingSubgoalId, setEditingSubgoalId] = useState<string | null>(null)
  const [editingSubgoalTitle, setEditingSubgoalTitle] = useState('')
  const [isAddingSubgoal, setIsAddingSubgoal] = useState(false)
  const [newSubgoalTitle, setNewSubgoalTitle] = useState('')
  const [subgoalError, setSubgoalError] = useState('')
  const [carryError, setCarryError] = useState('')
  const settings = useLiveQuery(getSettings, [])
  const effectiveSettings = settings ?? defaultSettings
  const activeMission = useLiveQuery(
    () => db.monthlyMissions.where('status').equals('active').first(),
    [],
  )
  const todayGoal = useLiveQuery(
    () => db.dailyGoals.where('date').equals(today).first(),
    [today],
  )
  const tomorrowGoal = useLiveQuery(
    () => db.dailyGoals.where('date').equals(tomorrow).first(),
    [tomorrow],
  )
  const subgoals = useLiveQuery<Subgoal[]>(
    () => todayGoal
      ? db.subgoals.where('dailyGoalId').equals(todayGoal.id).sortBy('order')
      : Promise.resolve([] as Subgoal[]),
    [todayGoal?.id],
  )
  const missionGoals = useLiveQuery<DailyGoal[]>(
    () => activeMission
      ? db.dailyGoals.where('monthlyMissionId').equals(activeMission.id).toArray()
      : Promise.resolve([] as DailyGoal[]),
    [activeMission?.id],
  )
  const todaySessions = useLiveQuery(
    () => db.focusSessions.toArray().then((sessions) => sessions.filter((session) =>
      toDateKey(new Date(session.startedAt)) === today,
    )),
    [today],
  )
  const sessionsForStreak = useLiveQuery(
    () => db.focusSessions.where('status').anyOf('completed', 'cancelled').toArray(),
    [],
  )
  const activeSession = useLiveQuery<FocusSession | undefined>(
    () => todayGoal
      ? db.focusSessions.toArray().then((sessions) => sessions.find((session) =>
        session.dailyGoalId === todayGoal.id &&
        (session.status === 'running' || session.status === 'paused'),
      ))
      : Promise.resolve(undefined),
    [todayGoal?.id],
  )
  const todayDistractions = useLiveQuery(
    () => db.distractions.toArray().then((distractions) => distractions.filter((distraction) =>
      toDateKey(new Date(distraction.occurredAt)) === today,
    )),
    [today],
  )

  useEffect(() => {
    if (todayGoal && subgoals) {
      void syncDailyGoalStatus(todayGoal.id)
    }
  }, [subgoals, todayGoal])

  const completedSubgoals = subgoals?.filter((subgoal) => subgoal.status === 'completed').length ?? 0
  const focusSessionsWithTime = todaySessions?.filter((session) =>
    (session.status === 'completed' || session.status === 'cancelled') && session.actualDurationSeconds > 0,
  ) ?? []
  const focusMinutes = Math.round(
    focusSessionsWithTime.reduce((total, session) => total + session.actualDurationSeconds, 0) / 60,
  )
  const missionGoalsInRange = activeMission && missionGoals
    ? missionGoals.filter((goal) => goal.date >= activeMission.startDate && goal.date <= activeMission.targetDate)
    : []
  const missionDayCount = activeMission
    ? countInclusiveDays(activeMission.startDate, activeMission.targetDate)
    : 0
  const completedMissionDays = new Set(
    missionGoalsInRange
      .filter((goal) => goal.status === 'completed')
      .map((goal) => goal.date),
  ).size
  const missionProgress = missionDayCount > 0
    ? Math.round((completedMissionDays / missionDayCount) * 100)
    : 0
  const currentStreak = calculateCurrentStreak(
    sessionsForStreak ?? [],
    effectiveSettings.dailyFocusTargetMinutes,
    today,
  )

  async function handleToggleSubgoal(id: string): Promise<void> {
    await toggleSubgoal(id)
  }

  function beginSubgoalEdit(id: string, title: string): void {
    setEditingSubgoalId(id)
    setEditingSubgoalTitle(title)
  }

  async function saveSubgoalEdit(id: string): Promise<void> {
    await updateSubgoalTitle(id, editingSubgoalTitle)
    setEditingSubgoalId(null)
    setEditingSubgoalTitle('')
  }

  async function handleLinkGoalToMission(): Promise<void> {
    if (todayGoal && activeMission) {
      await linkGoalToMission(todayGoal.id, activeMission.id)
    }
  }

  async function handleUnlinkGoalFromMission(): Promise<void> {
    if (todayGoal) {
      await unlinkGoalFromMission(todayGoal.id)
    }
  }

  async function handleAddSubgoal(): Promise<void> {
    if (!todayGoal) return

    try {
      setSubgoalError('')
      await addSubgoal({
        dailyGoalId: todayGoal.id,
        title: newSubgoalTitle,
        order: subgoals?.length ?? 0,
      })
      setNewSubgoalTitle('')
      setIsAddingSubgoal(false)
    } catch (caughtError) {
      setSubgoalError(caughtError instanceof Error ? caughtError.message : 'Unable to add this subgoal.')
    }
  }

  async function handleCarryGoalForward(): Promise<void> {
    if (!todayGoal) return

    try {
      setCarryError('')
      await carryGoalForward(todayGoal.id, tomorrow)
    } catch (caughtError) {
      setCarryError(caughtError instanceof Error ? caughtError.message : 'Unable to carry this goal forward.')
    }
  }

  function closeGoalDialog(): void {
    setDialogMode(null)
    setMissionToEdit(undefined)
  }

  return (
    <AppShell activePage={activePage} onNavigate={setActivePage}>
      {activePage === 'today' ? (
        <>
      <section className="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-300/80">
            {formatLongDate()}
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            Build a focused day.
          </h1>
          <p className="mt-3 max-w-xl text-[15px] leading-7 text-slate-400">
            One clear goal, honest sessions, and steady progress toward your
            bigger mission.
          </p>
        </div>

        <div className="flex items-center gap-3 text-sm text-amber-200">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-amber-400/20 bg-amber-400/10 text-lg">{currentStreak}</span>
          <span><strong className="font-semibold text-amber-100">day streak</strong><span className="ml-1 text-amber-200/60">at target</span></span>
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <Card variant="primary">
          <div className="mb-7 flex items-start justify-between gap-4">
            <div>
              <div className="mb-3 flex items-center gap-2 text-sm font-medium text-emerald-400">
                <Target size={17} />
                <span>Today&apos;s main goal</span>
              </div>
              <h2 className="text-2xl font-semibold text-white">
                {todayGoal?.title ?? 'Decide what deserves your focus'}
              </h2>
              <p className="mt-2 max-w-lg text-sm leading-6 text-slate-400">
                {todayGoal
                  ? `${completedSubgoals} of ${subgoals?.length ?? 0} subgoals completed.`
                  : 'Your first goal will guide the sessions and subgoals you create for today.'}
              </p>
            </div>
            <span className="rounded-full border border-slate-700/80 bg-slate-950/40 px-3 py-1 text-xs text-slate-400">
              {todayGoal ? goalStatusLabels[todayGoal.status] : 'Not started'}
            </span>
          </div>

          {todayGoal ? (
            <div className="mb-6 rounded-xl border border-slate-800/80 bg-slate-950/30 p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">Subgoals</p>
                <Button
                  type="button"
                  variant="ghost"
                  className="px-2 text-xs"
                  onClick={() => setIsAddingSubgoal(true)}
                >
                  Add subgoal
                </Button>
              </div>
              {isAddingSubgoal && (
                <form
                  className="mb-3 flex gap-2"
                  onSubmit={(event) => {
                    event.preventDefault()
                    void handleAddSubgoal()
                  }}
                >
                  <input
                    className="min-w-0 flex-1 rounded-lg border border-emerald-400/60 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none"
                    value={newSubgoalTitle}
                    onChange={(event) => setNewSubgoalTitle(event.target.value)}
                    placeholder="What is the next concrete step?"
                    autoFocus
                  />
                  <Button type="submit" className="px-3 py-2">Add</Button>
                  <Button type="button" variant="ghost" className="px-2" onClick={() => setIsAddingSubgoal(false)}>Cancel</Button>
                </form>
              )}
              {subgoalError && <p className="mb-3 text-xs text-rose-200" role="alert">{subgoalError}</p>}
              <ul className="space-y-2">
                {subgoals?.map((subgoal) => (
                  <li key={subgoal.id} className="group flex items-center gap-2 rounded-lg px-2 py-1 transition-colors hover:bg-slate-800/60">
                    {editingSubgoalId === subgoal.id ? (
                      <form
                        className="flex min-w-0 flex-1 items-center gap-2"
                        onSubmit={(event) => {
                          event.preventDefault()
                          void saveSubgoalEdit(subgoal.id)
                        }}
                      >
                        <input
                          className="min-w-0 flex-1 rounded-lg border border-emerald-400/60 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none"
                          value={editingSubgoalTitle}
                          onChange={(event) => setEditingSubgoalTitle(event.target.value)}
                          autoFocus
                        />
                        <Button type="submit" className="px-3 py-2">Save</Button>
                        <Button type="button" variant="ghost" className="px-2" onClick={() => setEditingSubgoalId(null)}>Cancel</Button>
                      </form>
                    ) : (
                      <>
                        <button
                          type="button"
                          className="shrink-0 rounded-full focus-visible:outline-2 focus-visible:outline-emerald-400"
                          aria-label={subgoal.status === 'completed' ? `Reopen ${subgoal.title}` : `Complete ${subgoal.title}`}
                          onClick={() => void handleToggleSubgoal(subgoal.id)}
                        >
                          {subgoal.status === 'completed'
                            ? <CheckCircle size={18} className="text-emerald-400" />
                            : <span className="block h-[18px] w-[18px] rounded-full border border-slate-600" />}
                        </button>
                        <span className={`min-w-0 flex-1 text-sm ${subgoal.status === 'completed' ? 'text-slate-500 line-through' : 'text-slate-300'}`}>
                          {subgoal.title}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          className="px-2 text-slate-600 opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100"
                          aria-label={`Edit ${subgoal.title}`}
                          onClick={() => beginSubgoalEdit(subgoal.id, subgoal.title)}
                        >
                          <Pencil size={15} />
                        </Button>
                      </>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="mb-6 rounded-xl border border-dashed border-slate-700/80 bg-slate-950/40 p-4 transition-colors hover:border-emerald-500/30">
              <p className="text-sm text-slate-500">No goal created yet</p>
              <p className="mt-1 text-sm text-slate-300">
                A specific goal will make your first focus session easier to start.
              </p>
            </div>
          )}

          <div className="flex flex-wrap gap-3">
            {!todayGoal && <Button onClick={() => setDialogMode('daily')}>Create today&apos;s goal</Button>}
            <Button disabled={!todayGoal} onClick={() => setIsFocusTimerOpen(true)}>
              {activeSession ? 'Open focus session' : 'Start focus session'}
            </Button>
            {todayGoal && todayGoal.status !== 'completed' && todayGoal.status !== 'cancelled' && todayGoal.status !== 'carried_over' && !tomorrowGoal && (
              <Button variant="ghost" onClick={() => void handleCarryGoalForward()}>Carry to tomorrow</Button>
            )}
          </div>
          {carryError && <p className="mt-3 text-xs text-rose-200" role="alert">{carryError}</p>}
        </Card>

        <Card variant="quiet">
          <div className="mb-5 flex items-center gap-2 text-sm font-medium text-slate-300">
            <Clock3 size={17} className="text-sky-400" />
            <span>Focus summary</span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <SummaryItem label="Focus time" value={`${focusMinutes}m`} />
            <SummaryItem label="Sessions with time" value={`${focusSessionsWithTime.length}`} />
            <SummaryItem label="Distractions" value={`${todayDistractions?.length ?? 0}`} />
            <SummaryItem label="Daily target" value={`${effectiveSettings.dailyFocusTargetMinutes}m`} />
          </div>
        </Card>
      </section>

      <section className="mt-5">
        <Card variant="quiet">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-300">Monthly mission</p>
              <p className="mt-1 text-xs text-slate-500">Your bigger direction</p>
            </div>
            <span className="rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-500">
              {missionProgress}%
            </span>
          </div>

          <div className="h-2 overflow-hidden rounded-full bg-slate-800">
            <div className="h-full rounded-full bg-emerald-400 transition-all" style={{ width: `${missionProgress}%` }} />
          </div>

          <div className="mt-5 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm text-slate-300">{activeMission?.title ?? 'No monthly mission yet'}</p>
              {activeMission && (
                <p className="mt-1 text-xs text-slate-500">
                  {completedMissionDays} of {missionDayCount} mission days complete · {activeMission.startDate} to {activeMission.targetDate}
                </p>
              )}
            </div>
            {activeMission ? (
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  className="px-2"
                  onClick={() => {
                    setMissionToEdit(activeMission)
                    setDialogMode('mission')
                  }}
                >
                  <Pencil size={15} className="mr-2" /> Edit mission
                </Button>
                {todayGoal?.monthlyMissionId === activeMission.id && (
                  <Button
                    variant="ghost"
                    className="px-2 text-slate-500"
                    onClick={() => void handleUnlinkGoalFromMission()}
                    aria-label="Unlink today's goal from this mission"
                  >
                    <Unlink size={15} />
                  </Button>
                )}
              </div>
            ) : (
              <Button variant="ghost" className="px-2" onClick={() => setDialogMode('mission')}>
                Add mission <ArrowRight size={15} className="ml-2" />
              </Button>
            )}
          </div>
          {activeMission && todayGoal && todayGoal.monthlyMissionId !== activeMission.id && (
            <div className="mt-4 flex items-center justify-between gap-4 rounded-xl border border-amber-500/20 bg-amber-500/[0.06] px-3 py-2.5">
              <p className="text-xs leading-5 text-amber-100/70">Today&apos;s goal is not linked to this mission.</p>
              <Button variant="secondary" className="shrink-0 px-3 py-2 text-xs" onClick={() => void handleLinkGoalToMission()}>
                <Link2 size={14} className="mr-1.5" /> Link goal
              </Button>
            </div>
          )}
        </Card>
      </section>

      {dialogMode && <GoalDialog mode={dialogMode} mission={missionToEdit} onClose={closeGoalDialog} />}
        </>
      ) : activePage === 'review' ? (
        <WeeklyReviewPage />
      ) : (
        <SettingsPage />
      )}

      {(isFocusTimerOpen || activeSession) && todayGoal && (
        <FocusTimer
          goal={todayGoal}
          subgoals={subgoals ?? []}
          existingSession={activeSession}
          settings={effectiveSettings}
          initiallyMinimized={!isFocusTimerOpen}
          onClose={() => setIsFocusTimerOpen(false)}
        />
      )}
    </AppShell>
  )
}

type SummaryItemProps = {
  label: string
  value: string
}

function SummaryItem({ label, value }: SummaryItemProps) {
  return (
    <div className="rounded-xl border border-slate-700/40 bg-slate-800/45 p-4">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
    </div>
  )
}

export default App
