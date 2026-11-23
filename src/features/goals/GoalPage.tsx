import { useNavigate, useSearchParams } from 'react-router-dom'
import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Plus, Target, CheckCircle2, RefreshCw, Pencil, CircleSlash, Flag } from 'lucide-react'
import { useGoalStore } from './goal.store'
import { addDays, format, parseISO } from 'date-fns'
import { validateGoalTitle } from '../../domain/validation'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import { Dialog } from '../../components/ui/Dialog'
import { FormField } from '../../components/ui/FormField'

const todayIso = format(new Date(), 'yyyy-MM-dd')

export function GoalPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const requestedDate = searchParams.get('date')
  const selectedDate = requestedDate && /^\d{4}-\d{2}-\d{2}$/.test(requestedDate)
    ? requestedDate
    : todayIso
  const selectedDateLabel = selectedDate === todayIso
    ? 'Today'
    : format(new Date(`${selectedDate}T12:00:00`), 'EEEE, MMMM d')
  const monthlyMissions = useGoalStore((state) => state.monthlyMissions)
  const dailyGoals = useGoalStore((state) => state.dailyGoals)
  const subgoals = useGoalStore((state) => state.subgoals)
  const createMission = useGoalStore((state) => state.createMission)
  const editMission = useGoalStore((state) => state.editMission)
  const createDailyGoal = useGoalStore((state) => state.createDailyGoal)
  const addSubgoal = useGoalStore((state) => state.addSubgoal)
  const editSubgoal = useGoalStore((state) => state.editSubgoal)
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
  const [editMissionId, setEditMissionId] = useState<number | null>(null)
  const [editMissionTitle, setEditMissionTitle] = useState('')
  const [editMissionDesc, setEditMissionDesc] = useState('')
  const [editMissionStart, setEditMissionStart] = useState(todayIso)
  const [editMissionTarget, setEditMissionTarget] = useState(todayIso)
  const [goalTitle, setGoalTitle] = useState('')
  const [goalMissionId, setGoalMissionId] = useState<number | null>(null)
  const [subgoalTitle, setSubgoalTitle] = useState('')
  const [editingSubgoalId, setEditingSubgoalId] = useState<number | null>(null)
  const [editingSubgoalTitle, setEditingSubgoalTitle] = useState('')
  const [error, setError] = useState('')
  const [editTitle, setEditTitle] = useState('')
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [confirmation, setConfirmation] = useState<{
    title: string
    description: string
    confirmLabel: string
    onConfirm: () => Promise<void>
  } | null>(null)
  const [confirming, setConfirming] = useState(false)


  const todayGoals = dailyGoals.filter(
    (goal) => goal.date === selectedDate && goal.status !== 'cancelled' && goal.status !== 'carried_over',
  )
  const todayGoal = todayGoals.find((goal) => !goal.isCarryOver) ?? todayGoals[0]
  const carriedGoals = todayGoals.filter((goal) => goal.isCarryOver && goal.id !== todayGoal?.id)
  const hasMainGoal = todayGoals.some((goal) => !goal.isCarryOver)
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

  const openMissionEditor = (mission: (typeof monthlyMissions)[number]) => {
    setError('')
    setEditMissionId(mission.id)
    setEditMissionTitle(mission.title)
    setEditMissionDesc(mission.description)
    setEditMissionStart(mission.startDate)
    setEditMissionTarget(mission.targetDate)
  }

  const handleEditMission = async (event: FormEvent) => {
    event.preventDefault()
    if (editMissionId === null) return
    setError('')
    try {
      await editMission(editMissionId, {
        title: editMissionTitle,
        description: editMissionDesc,
        startDate: editMissionStart,
        targetDate: editMissionTarget,
      })
      setEditMissionId(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update mission')
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

  const handleEditSubgoal = async (event: FormEvent) => {
    event.preventDefault()
    if (editingSubgoalId === null) return
    setError('')
    try {
      await editSubgoal(editingSubgoalId, editingSubgoalTitle)
      setEditingSubgoalId(null)
      setEditingSubgoalTitle('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update subgoal')
    }
  }

  const handleCompleteGoal = async () => {
    if (!todayGoal) return
    try {
      await completeGoal(todayGoal.id)
      await loadToday(selectedDate)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to complete goal')
    }
  }

  const handleCompleteCarriedGoal = async (goalId: number) => {
    try {
      await completeGoal(goalId)
      await loadToday(selectedDate)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to complete carried goal')
    }
  }

  const handleCarryForward = async () => {
    if (!todayGoal) return
    const tomorrow = format(addDays(parseISO(selectedDate), 1), 'yyyy-MM-dd')
    try {
      await carryGoalForward(selectedDate, tomorrow)
      await loadToday(selectedDate)
      navigate(`/goals?date=${tomorrow}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to carry goal forward')
    }
  }

  const handleConfirmAction = async () => {
    if (!confirmation || confirming) return
    setConfirming(true)
    try {
      await confirmation.onConfirm()
    } finally {
      setConfirmation(null)
      setConfirming(false)
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
      <header className="space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-white">Goals</h1>
            <p className="mt-1 text-sm text-slate-400">
              Plan your month, set a daily goal, and break it into subgoals.
            </p>
          </div>
          <FormField label="Plan for date">
            <input
              type="date"
              value={selectedDate}
              aria-label="Plan for date"
              onChange={(event) => {
                const date = event.target.value
                if (date) navigate(date === todayIso ? '/goals' : `/goals?date=${date}`)
              }}
              className="w-full rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 sm:w-auto"
            />
          </FormField>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => { setError(''); setMissionTarget(selectedDate); setOpenMissionDialog(true) }}>
            <Plus size={16} className="mr-2" /> Monthly mission
          </Button>
          {!hasMainGoal && (
            <Button variant="secondary" onClick={() => { setError(''); setOpenGoalDialog(true) }}>
              <Plus size={16} className="mr-2" /> Goal for {selectedDateLabel}
            </Button>
          )}
        </div>
      </header>

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
                <Button variant="ghost" onClick={() => openMissionEditor(mission)} aria-label={`Edit mission ${mission.title}`}>
                  <Pencil size={14} className="mr-1" /> Edit
                </Button>
                {mission.status !== 'completed' && (
                  <Button variant="ghost" onClick={() => setConfirmation({
                    title: 'Complete this monthly mission?',
                    description: `Completing “${mission.title}” will add it to your history. This status cannot be undone.`,
                    confirmLabel: 'Complete mission',
                    onConfirm: async () => {
                      try {
                        await completeMission(mission.id)
                      } catch (err) {
                        setError(err instanceof Error ? err.message : 'Failed to complete mission')
                      }
                    },
                  })} aria-label={`Complete mission ${mission.title}`}>
                    <Flag size={14} className="mr-1" /> Complete
                  </Button>
                )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {carriedGoals.length > 0 && (
        <Card>
          <div className="mb-3 flex items-center gap-2">
            <RefreshCw size={16} className="text-emerald-400" />
            <h2 className="text-sm font-semibold text-slate-200">Carried over</h2>
          </div>
          <ul className="space-y-2">
            {carriedGoals.map((goal) => (
              <li key={goal.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-700/60 bg-slate-900/50 p-3">
                <div>
                  <p className={`text-sm font-medium ${goal.status === 'completed' ? 'text-emerald-300 line-through' : 'text-white'}`}>
                    {goal.title}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">{goal.status === 'completed' ? 'Completed' : 'Still in progress'}</p>
                </div>
                {(goal.status === 'planned' || goal.status === 'in_progress') && (
                  <Button variant="secondary" onClick={() => setConfirmation({
                    title: 'Mark this goal complete?',
                    description: `Completing “${goal.title}” adds it to your history. This action cannot be undone.`,
                    confirmLabel: 'Mark complete',
                    onConfirm: () => handleCompleteCarriedGoal(goal.id),
                  })}>
                    Mark complete
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* Today&apos;s goal */}
      <Card>
        <div className="flex items-center gap-2 mb-4">
          <CheckCircle2 size={16} className="text-sky-400" />
          <h2 className="text-sm font-semibold text-slate-200">Main goal · {selectedDateLabel}</h2>
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
                    : todayGoal.status === 'cancelled'
                      ? 'bg-slate-800/50 text-slate-500 border border-slate-700/40'
                      : 'bg-slate-800/50 text-slate-400 border border-slate-700/40'
              }`}>
                {todayGoal.status === 'completed' ? 'Completed' : todayGoal.status === 'in_progress' ? 'In progress' : todayGoal.status === 'cancelled' ? 'Cancelled' : 'Planned'}
              </span>
            </div>
            {todayGoal.isCarryOver && (
              <p className="text-xs text-emerald-300/70">Carried over from a previous day</p>
            )}
            {todaySubgoals.length > 0 ? (
              <ul className="space-y-2">
                {todaySubgoals.map((subgoal) => (
                  <li key={subgoal.id} className="flex items-center gap-2 rounded-lg border border-slate-700/60 bg-slate-900/50 px-3 py-2">
                    {editingSubgoalId === subgoal.id ? (
                      <form onSubmit={handleEditSubgoal} className="flex min-w-0 flex-1 items-center gap-2">
                        <input
                          autoFocus
                          type="text"
                          aria-label={`Edit subgoal ${subgoal.title}`}
                          value={editingSubgoalTitle}
                          onChange={(event) => setEditingSubgoalTitle(event.target.value)}
                          className="min-w-0 flex-1 rounded-lg border border-slate-700 bg-slate-950/60 px-2 py-1 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                        <Button type="submit" disabled={!validateGoalTitle(editingSubgoalTitle).ok}>Save</Button>
                        <Button type="button" variant="ghost" onClick={() => setEditingSubgoalId(null)}>Cancel</Button>
                      </form>
                    ) : (
                      <>
                        <button
                          type="button"
                          disabled={!canUpdateGoal}
                          aria-label={`${subgoal.status === 'completed' ? 'Reopen' : 'Complete'} subgoal ${subgoal.title}`}
                          className="flex min-w-0 flex-1 items-center justify-between gap-3 text-left disabled:cursor-default"
                          onClick={() => { if (canUpdateGoal) void toggleSubgoal(subgoal.id) }}
                        >
                          <span className={`text-sm ${subgoal.status === 'completed' ? 'text-emerald-400 line-through' : 'text-slate-400'}`}>
                            {subgoal.title}
                          </span>
                          <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${subgoal.status === 'completed' ? 'bg-emerald-500 border-emerald-500' : 'bg-slate-900 border-slate-700'}`}>
                            {subgoal.status === 'completed' ? <CheckCircle2 size={12} className="text-slate-950" /> : null}
                          </span>
                        </button>
                        {canUpdateGoal && (
                          <Button
                            type="button"
                            variant="ghost"
                            className="px-2 py-1"
                            aria-label={`Edit subgoal ${subgoal.title}`}
                            onClick={() => {
                              setError('')
                              setEditingSubgoalId(subgoal.id)
                              setEditingSubgoalTitle(subgoal.title)
                            }}
                          >
                            <Pencil size={14} />
                          </Button>
                        )}
                      </>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-500">No subgoals yet.</p>
            )}
            {canUpdateGoal && (
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
            )}
            {todayGoal.status === 'cancelled' && <p className="text-xs text-slate-500">This goal is cancelled and kept in your history. Create a new goal for this date when you’re ready.</p>}
            <div className="mt-4 flex gap-2">
              {todayGoal.status !== 'cancelled' && (
                <Button onClick={() => { setError(''); setEditTitle(todayGoal.title); setEditDialogOpen(true) }} variant="secondary">
                  <Pencil size={15} className="mr-2" /> Edit goal
                </Button>
              )}
              {canUpdateGoal && (
                <>
                  <Button onClick={() => setConfirmation({
                    title: 'Mark this goal complete?',
                    description: `Completing “${todayGoal.title}” adds it to your history. This action cannot be undone.`,
                    confirmLabel: 'Mark complete',
                    onConfirm: handleCompleteGoal,
                  })} variant="secondary">
                    Mark goal complete
                  </Button>
                  <Button variant="ghost" onClick={() => setConfirmation({
                    title: 'Cancel this goal?',
                    description: `“${todayGoal.title}” will be kept in your history as cancelled. You can create a new goal for this date, but this goal cannot be restored.`,
                    confirmLabel: 'Cancel goal',
                    onConfirm: async () => {
                      try {
                        await cancelGoal(todayGoal.id)
                        await loadToday(selectedDate)
                      } catch (err) {
                        setError(err instanceof Error ? err.message : 'Failed to cancel goal')
                      }
                    },
                  })}>
                    <CircleSlash size={15} className="mr-2" /> Cancel goal
                  </Button>
                </>
              )}
              {canUpdateGoal && (
                <Button variant="ghost" onClick={() => {
                  setConfirmation({
                    title: 'Carry this goal to tomorrow?',
                    description: `This creates a copy for ${format(addDays(parseISO(selectedDate), 1), 'EEEE, MMMM d')} and marks today’s goal as carried over. This action cannot be undone.`,
                    confirmLabel: 'Carry to tomorrow',
                    onConfirm: handleCarryForward,
                  })
                }}>
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
              onClick={() => { setError(''); setOpenGoalDialog(true) }}
              className="mt-3"
            >
              <Plus size={16} className="mr-2" /> Create today&apos;s goal
            </Button>
          </div>
        )}
      </Card>

      {/* Dialogs */}
      <Dialog
        open={confirmation !== null}
        onClose={() => { if (!confirming) setConfirmation(null) }}
        title={confirmation?.title}
        description={confirmation?.description}
        size="sm"
      >
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setConfirmation(null)} disabled={confirming}>Cancel</Button>
          <Button
            variant="secondary"
            onClick={() => void handleConfirmAction()}
            disabled={confirming}
            className="border-rose-500/40 text-rose-300 hover:bg-rose-500/10"
          >
            {confirming ? 'Saving…' : confirmation?.confirmLabel}
          </Button>
        </div>
      </Dialog>

      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} title="Edit main goal" description="Make the result you want to finish today clear." size="sm">
        <form onSubmit={handleEditGoal} className="space-y-4">
          <FormField label="Title" required>
            <input
              type="text"
              value={editTitle}
              onChange={(event) => setEditTitle(event.target.value)}
              className="rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-200 w-full"
            />
          </FormField>
          {error && <p className="text-sm text-rose-300" role="alert">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button variant="ghost" type="button" onClick={() => setEditDialogOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={!validateGoalTitle(editTitle).ok}>Save goal</Button>
          </div>
        </form>
      </Dialog>

      <Dialog open={openMissionDialog} onClose={() => setOpenMissionDialog(false)} title="Create monthly mission" description="Choose a meaningful outcome and the date you want to reach it." size="md">
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
              required
              value={missionTarget}
              min={selectedDate}
              onChange={(e) => setMissionTarget(e.target.value)}
              className="rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 w-full"
            />
          </FormField>
          {error && <p className="text-sm text-rose-300" role="alert">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button variant="ghost" type="button" onClick={() => setOpenMissionDialog(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>Create mission</Button>
          </div>
        </form>
      </Dialog>

      <Dialog open={editMissionId !== null} onClose={() => setEditMissionId(null)} title="Edit monthly mission" description="Correct the mission title, details, or dates. Daily goals linked to this mission will stay connected." size="md">
        <form onSubmit={handleEditMission} className="space-y-4">
          <FormField label="Title" required error={editMissionTitle && !validateGoalTitle(editMissionTitle).ok ? 'Title must be specific (5+ chars)' : undefined}>
            <input
              type="text"
              value={editMissionTitle}
              onChange={(event) => setEditMissionTitle(event.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-200"
            />
          </FormField>
          <FormField label="Description">
            <textarea
              value={editMissionDesc}
              onChange={(event) => setEditMissionDesc(event.target.value)}
              rows={3}
              className="w-full rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-200"
            />
          </FormField>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Start date">
              <input type="date" required value={editMissionStart} onChange={(event) => setEditMissionStart(event.target.value)} className="w-full rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-200" />
            </FormField>
            <FormField label="Target date">
              <input type="date" required min={editMissionStart} value={editMissionTarget} onChange={(event) => setEditMissionTarget(event.target.value)} className="w-full rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-200" />
            </FormField>
          </div>
          {error && <p className="text-sm text-rose-300" role="alert">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button variant="ghost" type="button" onClick={() => setEditMissionId(null)}>Cancel</Button>
            <Button type="submit" disabled={!validateGoalTitle(editMissionTitle).ok || editMissionTarget < editMissionStart}>Save mission</Button>
          </div>
        </form>
      </Dialog>

      <Dialog open={openGoalDialog} onClose={() => setOpenGoalDialog(false)} title={`Create goal for ${selectedDateLabel.toLowerCase()}`} description="Choose one clear result to focus on for the selected date." size="md">
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
          {error && <p className="text-sm text-rose-300" role="alert">{error}</p>}
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
