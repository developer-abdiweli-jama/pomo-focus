import { useLiveQuery } from 'dexie-react-hooks'
import { useState, type FormEvent, type ReactNode } from 'react'
import { AlertTriangle, CheckCircle2, Clock3, Target } from 'lucide-react'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import { db } from '../../db/database'
import { getWeeklyReview, saveWeeklyReview } from '../../db/repositories/reviewRepository'
import type { Distraction } from '../../domain/models'
import { dateKeyWithOffset, getRollingWeekRange, toDateKey } from '../../lib/dates'

const inputClasses =
  'min-h-36 w-full resize-y rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-3 text-sm leading-6 text-slate-100 outline-none placeholder:text-slate-600 focus:border-emerald-400'

function WeeklyReviewPage() {
  const range = getRollingWeekRange()
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const storedReview = useLiveQuery(() => getWeeklyReview(range.start), [range.start])
  const weekSessions = useLiveQuery(
    () => db.focusSessions.toArray().then((items) => items.filter((item) => isInRange(item.startedAt, range))),
    [range.start, range.end],
  )
  const weekGoals = useLiveQuery(
    () => db.dailyGoals.toArray().then((items) => items.filter((item) => item.date >= range.start && item.date <= range.end)),
    [range.start, range.end],
  )
  const weekDistractions = useLiveQuery(
    () => db.distractions.toArray().then((items) => items.filter((item) => isInRange(item.occurredAt, range))),
    [range.start, range.end],
  )

  const completedSessions = (weekSessions ?? []).filter((session) => session.status === 'completed')
  const focusSessions = (weekSessions ?? []).filter((session) =>
    (session.status === 'completed' || session.status === 'cancelled') && session.actualDurationSeconds > 0,
  )
  const completedGoals = (weekGoals ?? []).filter((goal) => goal.status === 'completed')
  const carriedGoals = (weekGoals ?? []).filter((goal) => goal.isCarryOver)
  const focusMinutes = Math.round(focusSessions.reduce((total, session) => total + session.actualDurationSeconds, 0) / 60)
  const distractionNotes = (weekDistractions ?? []).filter((item): item is Distraction => Boolean(item.note.trim()))
  const dailyRows = weekSessions && weekGoals
    ? Array.from({ length: 7 }, (_, index) => {
      const date = dateKeyWithOffset(index - 6)
      const sessionsForDate = focusSessions.filter((session) => toDateKey(new Date(session.startedAt)) === date)
      const goalForDate = weekGoals.find((goal) => goal.date === date)

      return {
        date,
        focusMinutes: Math.round(sessionsForDate.reduce((total, session) => total + session.actualDurationSeconds, 0) / 60),
        goalStatus: goalForDate?.status,
      }
    })
    : []

  async function handleSaveReview(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    const reflection = String(formData.get('reflection') ?? '')
    setSaveState('saving')

    try {
      await saveWeeklyReview({
        weekStart: range.start,
        weekEnd: range.end,
        reflection,
      })
      setSaveState('saved')
    } catch {
      setSaveState('error')
    }
  }

  return (
    <section>
      <div className="mb-7">
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-300/80">Weekly review</p>
        <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">Look back honestly.</h1>
        <p className="mt-3 text-[15px] leading-7 text-slate-400">
          Last 7 days: {range.start} to {range.end}. These numbers come from your saved sessions and goals.
        </p>
      </div>

      <div className="mb-6 flex flex-col gap-6 border-b border-slate-800/80 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm font-medium text-sky-300">
            <Clock3 size={17} />
            <span>Focus time this week</span>
          </div>
          <p className="mt-2 text-5xl font-semibold tracking-tight text-white">{focusMinutes}m</p>
          <p className="mt-2 text-sm text-slate-500">Saved focus time across the last seven days.</p>
        </div>
        <div className="grid grid-cols-3 gap-5 sm:min-w-80">
          <ReviewMetric icon={<CheckCircle2 size={15} />} label="Sessions" value={`${completedSessions.length}`} />
          <ReviewMetric icon={<Target size={15} />} label="Goals" value={`${completedGoals.length}`} />
          <ReviewMetric icon={<AlertTriangle size={15} />} label="Distractions" value={`${weekDistractions?.length ?? 0}`} />
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.2fr_.8fr]">
        <Card variant="primary">
          <h2 className="text-lg font-semibold text-white">Your reflection</h2>
          <p className="mt-2 text-sm leading-6 text-slate-400">What helped, what got in the way, and what will you change next?</p>
          <form className="mt-5" onSubmit={handleSaveReview}>
            <textarea
              key={storedReview?.updatedAt ?? 'new-review'}
              name="reflection"
              className={inputClasses}
              defaultValue={storedReview?.reflection ?? ''}
              placeholder="I focused best when... Next week I will..."
            />
            <div className="mt-4 flex justify-end">
              <div className="flex items-center gap-3">
                {saveState === 'saved' && <span className="text-xs text-emerald-300" role="status">Saved locally.</span>}
                {saveState === 'error' && <span className="text-xs text-rose-300" role="alert">Could not save.</span>}
                <Button type="submit" disabled={saveState === 'saving'}>
                  {saveState === 'saving' ? 'Saving...' : 'Save reflection'}
                </Button>
              </div>
            </div>
          </form>
        </Card>

        <Card variant="quiet">
          <h2 className="text-lg font-semibold text-white">What happened</h2>
          <div className="mt-5 divide-y divide-slate-800/80 text-sm">
            <ReviewLine label="Carry-over goals created" value={`${carriedGoals.length}`} />
            <ReviewLine label="Focus sessions completed" value={`${completedSessions.length}`} />
            <ReviewLine label="Recorded distractions" value={`${weekDistractions?.length ?? 0}`} />
          </div>
          <div className="mt-6 border-t border-slate-800 pt-5">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Distraction notes</p>
            {distractionNotes.length > 0 ? (
              <ul className="mt-3 space-y-2 border-l border-amber-400/30 pl-3">
                {distractionNotes.map((distraction) => <li key={distraction.id} className="text-sm text-slate-300">{distraction.note}</li>)}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-slate-500">No distraction notes recorded in this period.</p>
            )}
          </div>
        </Card>
      </div>

      <Card variant="quiet" className="mt-5">
        <div className="mb-5">
          <h2 className="text-lg font-semibold text-white">Daily record</h2>
          <p className="mt-2 text-sm leading-6 text-slate-400">A simple record of what happened each day in this review period.</p>
        </div>
        <div className="divide-y divide-slate-800/80 border-y border-slate-800/80">
          {dailyRows.map((row) => (
            <div key={row.date} className="flex flex-wrap items-center justify-between gap-2 py-3">
              <p className="text-sm font-medium text-slate-300">{formatReviewDate(row.date)}</p>
              <div className="flex items-center gap-4 text-sm">
                <span className="text-white">{row.focusMinutes}m focus</span>
                <span className="text-xs text-slate-500">{formatGoalStatus(row.goalStatus)}</span>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </section>
  )
}

function isInRange(timestamp: string, range: { start: string; end: string }): boolean {
  const dateKey = toDateKey(new Date(timestamp))
  return dateKey >= range.start && dateKey <= range.end
}

function ReviewMetric({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="border-l border-slate-800 pl-3">
      <div className="flex items-center gap-1.5 text-slate-500">{icon}<span className="text-xs">{label}</span></div>
      <p className="mt-2 text-xl font-semibold text-white">{value}</p>
    </div>
  )
}

function ReviewLine({ label, value }: { label: string; value: string }) {
  return <div className="flex items-center justify-between py-3"><span className="text-slate-400">{label}</span><strong className="text-slate-100">{value}</strong></div>
}

function formatReviewDate(dateKey: string): string {
  return new Intl.DateTimeFormat('en', { weekday: 'short', month: 'short', day: 'numeric' }).format(new Date(`${dateKey}T12:00:00`))
}

function formatGoalStatus(status: string | undefined): string {
  if (status === 'completed') return 'Goal completed'
  if (status === 'carried_over') return 'Carried over'
  if (status) return 'Goal in progress'
  return 'No goal recorded'
}

export default WeeklyReviewPage
