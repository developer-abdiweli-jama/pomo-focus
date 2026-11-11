import { useNavigate, useSearchParams } from 'react-router-dom'
import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Plus, Target, CheckCircle2, RefreshCw, Pencil, CircleSlash, Flag } from 'lucide-react'
import { useGoalStore } from './goal.store'
import { addDays, format } from 'date-fns'
import { validateGoalTitle } from '../../domain/validation'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import { Dialog } from '../../components/ui/Dialog'
import { FormField } from '../../components/ui/FormField'

const todayIso = format(new Date(), 'yyyy-MM-dd')

export function GoalPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const selectedDate = searchParams.get('date') ?? todayIso
  const monthlyMissions = useGoalStore((state) => state.monthlyMissions)
  const dailyGoals = useGoalStore((state) => state.dailyGoals)
  const subgoals = useGoalStore((state) => state.subgoals)
  const createMission = useGoalStore((state) => state.createMission)
  const createDailyGoal = useGoalStore((state) => state.createDailyGoal)
  const addSubgoal = useGoalStore((state) => state.addSubgoal)
  const toggleSubgoal = useGoalStore((state) => state.toggleSubgoal)
  const completeGoal = useGoalStore((state) => state.completeGoal)
  const carryGoalForward = useGoalStore((state) => state.carryGoalForward)
  const editDailyGoal = useGoalStore((state) => state.editDailyGoal)
  const cancelGoal = useGoalStore((state) => state.cancelGoal)
  const completeMission = useGoalStore((state) => state.completeMission)
  const isLoading = useGoalStore((state) => state.isLoading)
  const loadToday = useGoalStore((state) => state.loadToday)

  useEffect(() => {
    void loadToday(selectedDate)
  }, [loadToday, selectedDate])

  const [openMissionDialog, setOpenMissionDialog] = useState(false)
  const [openGoalDialog, setOpenGoalDialog] = useState(false)
  const [missionTitle, setMissionTitle] = useState('')
  const [missionDesc, setMissionDesc] = useState('')
  const [missionTarget, setMissionTarget] = useState(todayIso)
  const [goalTitle, setGoalTitle] = useState('')
  const [goalMissionId, setGoalMissionId] = useState<number | null>(null)
  const [subgoalTitle, setSubgoalTitle] = useState('')
  const [error, setError] = useState('')
  const [editTitle, setEditTitle] = useState('')
  const [editDialogOpen, setEditDialogOpen] = useState(false)

  const todayGoals = dailyGoals.filter((g) => g.date === selectedDate)
  const todayGoal = todayGoals[0]
  const canUpdateGoal = todayGoal?.status === 'planned' || todayGoal?.status === 'in_progress'
  const todaySubgoals = todayGoal
    ? subgoals.filter((s) => s.dailyGoalId === todayGoal.id)
    : []

  const handleCreateMission = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    try {
      await createMission({
        title: missionTitle,
        description: missionDesc,
        startDate: selectedDate,
        targetDate: missionTarget,
      })
      setMissionTitle('')
      setMissionDesc('')
      setOpenMissionDialog(false)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to create mission',
      )
    }
  }

  const handleCreateGoal = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    try {
      await createDailyGoal({
        title: goalTitle,
        monthlyMissionId: goalMissionId,
        date: selectedDate,
      })
      setGoalTitle('')
      setGoalMissionId(null)
      setOpenGoalDialog(false)
      await loadToday(selectedDate)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create goal')
    }
  }

  const handleAddSubgoal = async () => {
    if (!todayGoal) return
    setError('')
    const validation = validateGoalTitle(subgoalTitle)
    if (!validation.ok) {
      setError(validation.reason ?? 'Invalid subgoal title')
      return
    }
    try {
      await addSubgoal({ dailyGoalId: todayGoal.id, title: subgoalTitle })
      setSubgoalTitle('')
      await loadToday(selectedDate)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add subgoal')
    }
  }

  const handleCompleteGoal = async () => {
    if (!todayGoal) return
    try {
      await completeGoal(todayGoal.id)
      await loadToday(todayIso)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to complete goal')
    }
  }

  const handleCarryForward = async () => {
    if (!todayGoal) return
    const tomorrow = format(addDays(new Date(selectedDate), 1), 'yyyy-MM-dd')
    try {
      await carryGoalForward(todayIso, tomorrow)
      await loadToday(selectedDate)
      navigate(`/goals?date=${tomorrow}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to carry goal forward')
    }
  }

  const handleEditGoal = async (event: FormEvent) => {
    event.preventDefault()
    if (!todayGoal) return
    try {
      await editDailyGoal(todayGoal.id, editTitle)
      setEditDialogOpen(false)
      setError('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update goal')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">Goals</h1>
          <p className="mt-1 text-sm text-slate-400">
            Plan your month, set today&apos;s main goal, and break it into
            subgoals.
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setOpenMissionDialog(true)}>
            <Plus size={16} className="mr-2" /> Monthly mission
          </Button>
          <Button variant="secondary" onClick={() => setOpenGoalDialog(true)}>
            <Plus size={16} className="mr-2" /> Today&apos;s goal
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-rose-500/10 border border-rose-500/30 p-3 text-xs text-rose-300">
          {error}
        </div>
      )}

      {/* Monthly missions */}
      <Card>
        <div className="flex items-center gap-2 mb-4">
          <Target size={16} className="text-emerald-400" />
          <h2 className="text-sm font-semibold text-slate-200">Monthly missions</h2>
        </div>
        {monthlyMissions.length === 0 ? (
          <p className="text-sm text-slate-500">No monthly mission yet. Create one to anchor your goals.</p>
        ) : (
          <ul className="space-y-2">
            {monthlyMissions.map((mission) => (
              <li key={mission.id} className="flex items-center justify-between rounded-lg border border-slate-700/60 bg-slate-900/50 p-3">
                <div>
                  <p className="text-sm font-medium text-white">{mission.title}</p>
                  <p className="text-xs text-slate-400">
                    {format(new Date(mission.targetDate), 'MMM d')} &bull; {mission.status.replace(/_/g, ' ')}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                <span className={`rounded-full px-2 py-0.5 text-xs ${
                  mission.status === 'completed'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : 'bg-slate-800/50 text-slate-400 border border-slate-700/40'
                }`}>
                  {mission.status === 'completed' ? 'Completed' : 'Active'}
                </span>
                {mission.status !== 'completed' && (
                  <Button variant="ghost" onClick={() => void completeMission(mission.id)} aria-label={`Complete mission ${mission.title}`}>
                    <Flag size={14} className="mr-1" /> Complete
                  </Button>
                )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* Today&apos;s goal */}
      <Card>
        <div className="flex items-center gap-2 mb-4">
          <CheckCircle2 size={16} className="text-sky-400" />
          <h2 className="text-sm font-semibold text-slate-200">Today&apos;s main goal</h2>
        </div>
        {todayGoal ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-base font-medium text-white">{todayGoal.title}</p>
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                todayGoal.status === 'completed'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : todayGoal.status === 'in_progress'
                    ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                    : 'bg-slate-800/50 text-slate-400 border border-slate-700/40'
              }`}>
                {todayGoal.status === 'completed' ? 'Completed' : todayGoal.status === 'in_progress' ? 'In progress' : 'Planned'}
              </span>
            </div>
            {todayGoal.isCarryOver && (
              <p className="text-xs text-emerald-300/70">Carried over from a previous day</p>
            )}
            <div className="space-y-2">
              {todaySubgoals.length > 0 ? (
                todaySubgoals.map((subgoal) => (
                  <button
                    key={subgoal.id}
                    type="button"
                    className="w-full flex items-center justify-between gap-3 rounded-lg border border-slate-700/60 bg-slate-900/50 px-3 py-2 text-left transition-colors hover:border-emerald-500/40"
                    onClick={() => toggleSubgoal(subgoal.id)}
                  >
                    <span className={`text-sm ${subgoal.status === 'completed' ? 'text-emerald-400 line-through' : 'text-slate-400'}`}>
                      {subgoal.title}
                    </span>
                    <span className={`flex h-5 w-5 items-center justify-center rounded-full border ${subgoal.status === 'completed' ? 'bg-emerald-500 border-emerald-500' : 'bg-slate-900 border-slate-700'}`}>
                      {subgoal.status === 'completed' ? (
                        <CheckCircle2 size={12} className="text-slate-950" />
                      ) : null}
                    </span>
                  </button>
                ))
              ) : (
                <p className="text-sm text-slate-500">No subgoals yet.</p>
              )}
            </div>
            <div className="mt-4 flex gap-2">
              <input
                type="text"
                placeholder="Add a subgoal…"
                value={subgoalTitle}
                onChange={(e) => setSubgoalTitle(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddSubgoal()}
                className="flex-1 rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <Button onClick={handleAddSubgoal} disabled={!subgoalTitle.trim()}>
                <Plus size={16} className="mr-2" /> Add
              </Button>
            </div>
            <div className="mt-4 flex gap-2">
              {canUpdateGoal && (
                <>
                  <Button onClick={() => { setEditTitle(todayGoal.title); setEditDialogOpen(true) }} variant="secondary">
                    <Pencil size={15} className="mr-2" /> Edit goal
                  </Button>
                  <Button onClick={handleCompleteGoal} variant="secondary">
                    Mark goal complete
                  </Button>
                  <Button variant="ghost" onClick={() => void cancelGoal(todayGoal.id)}>
                    <CircleSlash size={15} className="mr-2" /> Cancel goal
                  </Button>
                </>
              )}
              {canUpdateGoal && (
                <Button variant="ghost" onClick={handleCarryForward}>
                  <RefreshCw size={16} className="mr-2" /> Carry to tomorrow
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-slate-700/80 bg-slate-950/40 p-6 text-center">
            <p className="text-sm text-slate-500">No main goal for today.</p>
            <Button
              variant="secondary"
              onClick={() => setOpenGoalDialog(true)}
              className="mt-3"
            >
              <Plus size={16} className="mr-2" /> Create today&apos;s goal
            </Button>
          </div>
        )}
      </Card>

      {/* Dialogs */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} title="Edit main goal">
        <form onSubmit={handleEditGoal} className="space-y-4">
          <FormField label="Title" required>
            <input
              type="text"
              value={editTitle}
              onChange={(event) => setEditTitle(event.target.value)}
              className="rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-200 w-full"
            />
          </FormField>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" type="button" onClick={() => setEditDialogOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={!validateGoalTitle(editTitle).ok}>Save goal</Button>
          </div>
        </form>
      </Dialog>

      <Dialog open={openMissionDialog} onClose={() => setOpenMissionDialog(false)} title="Create monthly mission">
        <form onSubmit={handleCreateMission} className="space-y-4">
          <FormField label="Title" required error={missionTitle && !validateGoalTitle(missionTitle).ok ? 'Title must be specific (5+ chars)' : undefined}>
            <input
              type="text"
              value={missionTitle}
              onChange={(e) => setMissionTitle(e.target.value)}
              placeholder="e.g. Ship the async/await exercise"
              className="rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 w-full"
            />
          </FormField>
          <FormField label="Description">
            <textarea
              value={missionDesc}
              onChange={(e) => setMissionDesc(e.target.value)}
              rows={3}
              className="rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 w-full"
            />
          </FormField>
          <FormField label="Target date">
            <input
              type="date"
              value={missionTarget}
              onChange={(e) => setMissionTarget(e.target.value)}
              className="rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 w-full"
            />
          </FormField>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" type="button" onClick={() => setOpenMissionDialog(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>Create mission</Button>
          </div>
        </form>
      </Dialog>

      <Dialog open={openGoalDialog} onClose={() => setOpenGoalDialog(false)} title="Create today&apos;s main goal">
        <form onSubmit={handleCreateGoal} className="space-y-4">
          <FormField label="Title" required error={goalTitle && !validateGoalTitle(goalTitle).ok ? 'Be specific — describe what done looks like' : undefined}>
            <input
              type="text"
              value={goalTitle}
              onChange={(e) => setGoalTitle(e.target.value)}
              placeholder="e.g. Finish the React timer component and write tests"
              className="rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 w-full"
            />
          </FormField>
          <FormField label="Monthly mission (optional)">
            <select
              value={goalMissionId ?? ''}
              onChange={(e) => setGoalMissionId(e.target.value ? Number(e.target.value) : null)}
              className="rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 w-full"
            >
              <option value="">None</option>
              {monthlyMissions.map((mission) => (
                <option key={mission.id} value={mission.id}>
                  {mission.title}
                </option>
              ))}
            </select>
          </FormField>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" type="button" onClick={() => setOpenGoalDialog(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>Create goal</Button>
          </div>
        </form>
      </Dialog>
    </div>
  )
}
