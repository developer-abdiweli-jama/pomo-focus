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

export function ReviewPage() {
  const navigate = useNavigate()
  const currentStreak = useRewardStore((state) => state.currentStreak)
  const refreshMetrics = useRewardStore((state) => state.refreshMetrics)

  const [weekStart, setWeekStart] = useState(format(startOfWeek(new Date()), 'yyyy-MM-dd'))
  const [sessions, setSessions] = useState<number>(0)
  const [focusMinutes, setFocusMinutes] = useState<number>(0)
  const [completedGoals, setCompletedGoals] = useState<number>(0)
  const [distractionCount, setDistractionCount] = useState<number>(0)
  const [distractionNotes, setDistractionNotes] = useState<string[]>([])
  const [reviewOpen, setReviewOpen] = useState(false)
  const [reflection, setReflection] = useState('')
  const [loading, setLoading] = useState(true)
  const [dailyTarget, setDailyTarget] = useState(DEFAULT_USER_SETTINGS.dailyFocusTarget)

  const weekEnd = format(endOfWeek(new Date(weekStart)), 'yyyy-MM-dd')

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
        setReflection(existingReview?.reflection ?? '')
        const completedSessions = sessionList.filter((s) => s.status === 'completed')
        setSessions(completedSessions.length)
        setFocusMinutes(
          completedSessions.reduce((sum, s) => sum + (s.actualDuration ?? 0), 0),
        )
        const weekGoals = goals.filter(
          (g) => g.date >= weekStart && g.date <= weekEnd,
        )
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
    setWeekStart(format(subWeeks(new Date(weekStart), 1), 'yyyy-MM-dd'))
  }
  const nextWeek = () => {
    setWeekStart(format(subWeeks(new Date(weekStart), -1), 'yyyy-MM-dd'))
  }

  const isCurrentWeek =
    weekStart === format(startOfWeek(new Date()), 'yyyy-MM-dd')

  const handleSaveReview = async () => {
    if (!reflection.trim()) return
    try {
      await saveWeeklyReview({
        date: weekStart,
        reflection: reflection.trim(),
        completedGoal: completedGoals > 0,
        focusMinutes,
        distractionCount,
      })
      setReflection('')
      setReviewOpen(false)
      await refreshMetrics(weekStart, weekEnd)
    } catch (err) {
      console.error(err)
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

      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          onClick={previousWeek}
          disabled={isCurrentWeek}
        >
          <ChevronLeft size={16} /> Previous week
        </Button>
        <span className="text-sm font-medium text-slate-300">
          {format(new Date(weekStart), 'MMM d')} –{' '}
          {format(new Date(weekEnd), 'MMM d, yyyy')}
        </span>
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
            What helped you focus? What distracted you? What will you change
            next week? Be honest — there&apos;s no shame in a tough week.
          </p>
          <Button
            variant="ghost"
            onClick={() => setReviewOpen(true)}
            className="w-full"
          >
            Write this week&apos;s review
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
      >
        <p className="text-sm text-slate-300 mb-4">
          Take a few minutes to reflect. Your answers are stored locally only.
        </p>
        <textarea
          value={reflection}
          onChange={(e) => setReflection(e.target.value)}
          rows={6}
          placeholder="What helped me focus? What distracted me? What should I change next week? What am I proud of?"
          className="rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 w-full mb-4"
        />
        <div className="flex justify-end">
          <Button onClick={handleSaveReview} disabled={!reflection.trim()}>
            Save reflection
          </Button>
        </div>
      </Dialog>
    </div>
  )
}
