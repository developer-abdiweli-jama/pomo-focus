import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BookOpen, PhoneOff, CheckCircle2, ChevronLeft, ChevronRight } from 'lucide-react'
import { useRewardStore } from '../rewards/reward.store'
import {
  getSessionsForRange,
} from '../../db/repositories/sessionRepository'
import { getDailyGoals } from '../../db/repositories/goalRepository'
import { getDistractionsForRange } from '../../db/repositories/distractionRepository'
import { getWeeklyReview, saveWeeklyReview } from '../../db/repositories/weeklyReviewRepository'
import { format, startOfWeek, endOfWeek, subWeeks } from 'date-fns'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import { Dialog } from '../../components/ui/Dialog'
import { ProgressBar } from '../../components/ui/ProgressBar'
import { getSettings, DEFAULT_USER_SETTINGS } from '../../db/repositories/settingsRepository'
import type { DailyGoal } from '../../domain/models'

export function ReviewPage() {
  const navigate = useNavigate()
  const currentStreak = useRewardStore((state) => state.currentStreak)
  const refreshMetrics = useRewardStore((state) => state.refreshMetrics)

  const [weekDate, setWeekDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [sessions, setSessions] = useState<number>(0)
  const [focusMinutes, setFocusMinutes] = useState<number>(0)
  const [completedGoals, setCompletedGoals] = useState<number>(0)
  const [distractionCount, setDistractionCount] = useState<number>(0)
  const [distractionNotes, setDistractionNotes] = useState<string[]>([])
  const [weekGoals, setWeekGoals] = useState<readonly DailyGoal[]>([])
  const [reviewOpen, setReviewOpen] = useState(false)
  const [wins, setWins] = useState('')
  const [challenges, setChallenges] = useState('')
  const [adjustment, setAdjustment] = useState('')
  const [nextPriority, setNextPriority] = useState('')
  const [reviewError, setReviewError] = useState('')
  const [loading, setLoading] = useState(true)
  const [dailyTarget, setDailyTarget] = useState(DEFAULT_USER_SETTINGS.dailyFocusTarget)

  const weekStart = format(startOfWeek(new Date(`${weekDate}T12:00:00`)), 'yyyy-MM-dd')
  const weekEnd = format(endOfWeek(new Date(`${weekDate}T12:00:00`)), 'yyyy-MM-dd')

  useEffect(() => {
    let mounted = true
    async function load() {
      setLoading(true)
      try {
        const settings = await getSettings()
        if (mounted) setDailyTarget(settings?.dailyFocusTarget ?? DEFAULT_USER_SETTINGS.dailyFocusTarget)
        await refreshMetrics(weekStart, weekEnd)
        const [sessionList, goals, distractions, existingReview] = await Promise.all([
          getSessionsForRange(weekStart, weekEnd),
          getDailyGoals(),
          getDistractionsForRange(weekStart, weekEnd),
          getWeeklyReview(weekStart),
        ])
        if (!mounted) return
        setWins(existingReview?.wins ?? existingReview?.reflection ?? '')
        setChallenges(existingReview?.challenges ?? '')
        setAdjustment(existingReview?.adjustment ?? '')
        setNextPriority(existingReview?.nextPriority ?? '')
        const completedSessions = sessionList.filter((s) => s.status === 'completed')
        setSessions(completedSessions.length)
        setFocusMinutes(
          completedSessions.reduce((sum, s) => sum + (s.actualDuration ?? 0), 0),
        )
        const weekGoals = goals.filter(
          (g) => g.date >= weekStart && g.date <= weekEnd,
        )
        setWeekGoals(weekGoals.slice().sort((a, b) => a.date.localeCompare(b.date)))
        setCompletedGoals(weekGoals.filter((g) => g.status === 'completed').length)
        setDistractionCount(distractions.length)
        setDistractionNotes(distractions.map((d) => d.note))
      } catch (err) {
        console.error(err)
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    return () => {
      mounted = false
    }
  }, [weekStart, weekEnd, refreshMetrics])

  const previousWeek = () => {
    setWeekDate(format(subWeeks(new Date(`${weekDate}T12:00:00`), 1), 'yyyy-MM-dd'))
  }
  const nextWeek = () => {
    setWeekDate(format(subWeeks(new Date(`${weekDate}T12:00:00`), -1), 'yyyy-MM-dd'))
  }

  const isCurrentWeek =
    weekStart === format(startOfWeek(new Date()), 'yyyy-MM-dd')

  const handleSaveReview = async () => {
    const reflection = [
      wins.trim() && `What went well: ${wins.trim()}`,
      challenges.trim() && `What got in the way: ${challenges.trim()}`,
      adjustment.trim() && `What I’ll change: ${adjustment.trim()}`,
      nextPriority.trim() && `Next week’s priority: ${nextPriority.trim()}`,
    ].filter(Boolean).join('\n\n')
    if (!reflection) return
    setReviewError('')
    try {
      await saveWeeklyReview({
        date: weekStart,
        reflection: reflection.trim(),
        completedGoal: completedGoals > 0,
        focusMinutes,
        distractionCount,
        wins: wins.trim(),
        challenges: challenges.trim(),
        adjustment: adjustment.trim(),
        nextPriority: nextPriority.trim(),
      })
      setReviewOpen(false)
      await refreshMetrics(weekStart, weekEnd)
    } catch (err) {
      setReviewError(err instanceof Error ? err.message : 'Could not save the weekly reflection.')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <p className="text-slate-500">Loading review…</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <Button variant="ghost" onClick={() => navigate('/')}>
          <ChevronLeft size={16} className="mr-2" /> Back to today
        </Button>
        <h1 className="text-2xl font-semibold tracking-tight text-white">Weekly review</h1>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="ghost"
          onClick={previousWeek}
          disabled={isCurrentWeek}
        >
          <ChevronLeft size={16} /> Previous week
        </Button>
        <span className="text-sm font-medium text-slate-300">
          {format(new Date(`${weekStart}T12:00:00`), 'MMM d')} –{' '}
          {format(new Date(`${weekEnd}T12:00:00`), 'MMM d, yyyy')}
        </span>
        <label className="flex items-center gap-2 text-sm text-slate-400">
          <span>Choose week</span>
          <input
            type="date"
            value={weekDate}
            aria-label="Choose a date in the week to review"
            onChange={(event) => event.target.value && setWeekDate(event.target.value)}
            className="rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </label>
        {!isCurrentWeek && (
          <Button variant="ghost" onClick={nextWeek}>
            Next week <ChevronRight size={16} />
          </Button>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-4">
        <Card className="p-4">
          <p className="text-xs text-slate-500">Focus time this week</p>
          <p className="mt-2 text-2xl font-semibold text-white">{focusMinutes}m</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-slate-500">Sessions completed</p>
          <p className="mt-2 text-2xl font-semibold text-white">{sessions}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-slate-500">Goals completed</p>
          <p className="mt-2 text-2xl font-semibold text-white">{completedGoals}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-slate-500">Current streak</p>
          <p className="mt-2 text-2xl font-semibold text-white">{currentStreak} days</p>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <BookOpen size={16} className="text-violet-400" />
            <h2 className="text-sm font-semibold text-slate-200">Reflection</h2>
          </div>
          <p className="text-sm text-slate-400 mb-4">
            Capture a win, a challenge, one adjustment, and a priority for next week. Keep it honest and useful.
          </p>
          {(wins || challenges || adjustment || nextPriority) && (
            <dl className="mb-4 space-y-3 rounded-lg border border-slate-700/50 bg-slate-950/30 p-4">
              {[
                ['What went well', wins],
                ['What got in the way', challenges],
                ['What to adjust', adjustment],
                ['Next week’s priority', nextPriority],
              ].filter(([, value]) => value).map(([label, value]) => (
                <div key={label}>
                  <dt className="text-xs font-medium text-slate-500">{label}</dt>
                  <dd className="mt-1 whitespace-pre-wrap text-sm text-slate-300">{value}</dd>
                </div>
              ))}
            </dl>
          )}
          <Button
            variant="ghost"
            onClick={() => setReviewOpen(true)}
            className="w-full"
          >
            {wins || challenges || adjustment || nextPriority ? 'Edit this week’s review' : 'Write this week’s review'}
          </Button>
        </Card>

        <Card>
          <div className="flex items-center gap-2 mb-4">
            <PhoneOff size={16} className="text-rose-400" />
            <h2 className="text-sm font-semibold text-slate-200">Distractions</h2>
          </div>
          <p className="text-xs text-slate-500 mb-2">
            {distractionCount} distraction{distractionCount === 1 ? '' : 's'} recorded this week
          </p>
          {distractionNotes.length > 0 ? (
            <ul className="text-sm text-slate-400 space-y-1 max-h-40 overflow-y-auto">
              {distractionNotes.map((note, i) => (
                <li key={i} className="truncate">— {note}</li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-emerald-400">None recorded. Honest focus.</p>
          )}
        </Card>
      </div>

      <Card>
        <div className="mb-4 flex items-center gap-2">
          <CheckCircle2 size={16} className="text-emerald-400" />
          <h2 className="text-sm font-semibold text-slate-200">Goals this week</h2>
        </div>
        {weekGoals.length ? (
          <ul className="divide-y divide-slate-800">
            {weekGoals.map((goal) => (
              <li key={goal.id} className="flex flex-wrap items-center justify-between gap-2 py-3 first:pt-0 last:pb-0">
                <div className="min-w-0">
                  <p className="break-words text-sm font-medium text-slate-200">{goal.title}</p>
                  <p className="mt-1 text-xs text-slate-500">{format(new Date(`${goal.date}T12:00:00`), 'EEEE, MMM d')}{goal.isCarryOver ? ' · Carried over' : ''}</p>
                </div>
                <span className={`shrink-0 rounded-full border px-2.5 py-1 text-xs ${goal.status === 'completed' ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300' : goal.status === 'cancelled' ? 'border-slate-700 text-slate-500' : 'border-amber-500/25 bg-amber-500/5 text-amber-300'}`}>
                  {goal.status === 'completed' ? 'Completed' : goal.status === 'cancelled' ? 'Cancelled' : goal.status === 'carried_over' ? 'Carried over' : goal.status === 'in_progress' ? 'In progress' : 'Not completed'}
                </span>
              </li>
            ))}
          </ul>
        ) : <p className="text-sm text-slate-500">No goals were planned for this week.</p>}
      </Card>

      <Card>
        <div className="flex items-center gap-2 mb-4">
          <CheckCircle2 size={16} className="text-emerald-400" />
          <h2 className="text-sm font-semibold text-slate-200">Weekly focus</h2>
        </div>
        <p className="text-sm text-slate-400 mb-4">
          Focus time versus a {dailyTarget}-minute daily target across the week.
        </p>
        <ProgressBar value={Math.min(100, Math.round((focusMinutes / (dailyTarget * 7)) * 100))} />
      </Card>

      <Dialog
        open={reviewOpen}
        onClose={() => setReviewOpen(false)}
        title="Weekly reflection"
        description="Take a few minutes to reflect. Your answers are stored locally only."
        size="md"
      >
        {reviewError && <p className="text-sm text-rose-300" role="alert">{reviewError}</p>}
        <div className="space-y-4">
          <label className="block text-sm text-slate-300">What went well?
            <textarea value={wins} onChange={(e) => setWins(e.target.value)} rows={2} placeholder="A goal, session, or moment you feel good about" className="mt-1.5 w-full rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-200" />
          </label>
          <label className="block text-sm text-slate-300">What got in the way?
            <textarea value={challenges} onChange={(e) => setChallenges(e.target.value)} rows={2} placeholder="Patterns or obstacles you noticed" className="mt-1.5 w-full rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-200" />
          </label>
          <label className="block text-sm text-slate-300">What will you adjust?
            <textarea value={adjustment} onChange={(e) => setAdjustment(e.target.value)} rows={2} placeholder="One small change for next week" className="mt-1.5 w-full rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-200" />
          </label>
          <label className="block text-sm text-slate-300">Next week’s priority
            <textarea value={nextPriority} onChange={(e) => setNextPriority(e.target.value)} rows={2} placeholder="The most important outcome to move forward" className="mt-1.5 w-full rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-200" />
          </label>
        </div>
        <div className="flex justify-end">
          <Button onClick={handleSaveReview} disabled={!wins.trim() && !challenges.trim() && !adjustment.trim() && !nextPriority.trim()}>
            Save review
          </Button>
        </div>
      </Dialog>
    </div>
  )
}
