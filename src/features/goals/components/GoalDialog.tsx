import { Plus, Trash2 } from 'lucide-react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useState, type FormEvent } from 'react'
import { db } from '../../../db/database'
import {
  createDailyGoalWithSubgoals,
  createMonthlyMission,
  updateMonthlyMission,
} from '../../../db/repositories/goalRepository'
import type { MonthlyMission } from '../../../domain/models'
import { dateKeyWithOffset, todayDateKey } from '../../../lib/dates'
import Button from '../../../components/ui/Button'
import Dialog from '../../../components/ui/Dialog'

export type GoalDialogMode = 'mission' | 'daily'

type GoalDialogProps = {
  mode: GoalDialogMode
  onClose: () => void
  mission?: MonthlyMission
}

const inputClasses =
  'mt-2 w-full rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2.5 text-sm text-slate-100 outline-none transition-colors placeholder:text-slate-600 focus:border-emerald-400'

function GoalDialog({ mode, onClose, mission }: GoalDialogProps) {
  const activeMissions = useLiveQuery(
    () => db.monthlyMissions.where('status').equals('active').toArray(),
    [],
  )
  const [title, setTitle] = useState(mission?.title ?? '')
  const [description, setDescription] = useState(mission?.description ?? '')
  const [startDate, setStartDate] = useState(mission?.startDate ?? todayDateKey())
  const [targetDate, setTargetDate] = useState(mission?.targetDate ?? dateKeyWithOffset(30))
  const [missionId, setMissionId] = useState('')
  const [subgoalTitles, setSubgoalTitles] = useState([''])
  const [error, setError] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const isMission = mode === 'mission'
  const isEditingMission = isMission && Boolean(mission)
  const selectedMissionId = missionId

  function updateSubgoal(index: number, value: string): void {
    setSubgoalTitles((current) =>
      current.map((subgoal, currentIndex) =>
        currentIndex === index ? value : subgoal,
      ),
    )
  }

  function addSubgoalField(): void {
    setSubgoalTitles((current) => [...current, ''])
  }

  function removeSubgoalField(index: number): void {
    setSubgoalTitles((current) => current.filter((_, currentIndex) => currentIndex !== index))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    setError('')
    setIsSaving(true)

    try {
      if (isMission) {
        const missionInput = { title, description, startDate, targetDate }
        if (mission) {
          await updateMonthlyMission(mission.id, missionInput)
        } else {
          await createMonthlyMission(missionInput)
        }
      } else {
        const validSubgoals = subgoalTitles.map((subgoal) => subgoal.trim()).filter(Boolean)

        if (validSubgoals.length === 0) {
          throw new Error('Add at least one subgoal to guide today\'s work.')
        }

        await createDailyGoalWithSubgoals({
          title,
          date: todayDateKey(),
          monthlyMissionId: selectedMissionId || undefined,
          subgoalTitles: validSubgoals,
        })
      }

      onClose()
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Unable to save this goal.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog
      title={isEditingMission ? 'Edit monthly mission' : isMission ? 'Create a monthly mission' : 'Create today\'s goal'}
      description={
        isMission
          ? 'Choose the bigger direction that your daily goals will support.'
          : 'Make the goal specific enough that you will know when it is finished.'
      }
      onClose={onClose}
    >
      <form className="space-y-5" onSubmit={handleSubmit}>
        <label className="block text-sm font-medium text-slate-300">
          {isMission ? 'Mission title' : 'Today\'s main goal'}
          <input
            className={inputClasses}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder={isMission ? 'Finish the TypeScript course' : 'Complete the async/await exercise and test it'}
            autoFocus
          />
        </label>

        {isMission ? (
          <>
            <label className="block text-sm font-medium text-slate-300">
              Why does this matter? <span className="font-normal text-slate-600">(optional)</span>
              <textarea
                className={`${inputClasses} min-h-24 resize-y`}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Describe the result you want by the end of the mission."
              />
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-medium text-slate-300">
                Start date
                <input
                  className={inputClasses}
                  type="date"
                  value={startDate}
                  onChange={(event) => setStartDate(event.target.value)}
                />
              </label>
              <label className="block text-sm font-medium text-slate-300">
                Target date
                <input
                  className={inputClasses}
                  type="date"
                  value={targetDate}
                  onChange={(event) => setTargetDate(event.target.value)}
                />
              </label>
            </div>
          </>
        ) : (
          <>
            {activeMissions && activeMissions.length > 0 && (
              <label className="block text-sm font-medium text-slate-300">
                Monthly mission <span className="font-normal text-slate-600">(optional)</span>
                <select
                  className={inputClasses}
                  value={selectedMissionId}
                  onChange={(event) => setMissionId(event.target.value)}
                >
                  <option value="">No mission selected</option>
                  {activeMissions.map((mission) => (
                    <option key={mission.id} value={mission.id}>
                      {mission.title}
                    </option>
                  ))}
                </select>
              </label>
            )}

            <div>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-slate-300">Subgoals</p>
                  <p className="mt-1 text-xs text-slate-500">Small steps that lead to the main goal.</p>
                </div>
                <Button type="button" variant="ghost" className="px-2" onClick={addSubgoalField}>
                  <Plus size={16} className="mr-1" /> Add step
                </Button>
              </div>

              <div className="mt-3 space-y-3">
                {subgoalTitles.map((subgoal, index) => (
                  <div key={`subgoal-${index}`} className="flex items-center gap-2">
                    <input
                      className={inputClasses.replace('mt-2', 'mt-0')}
                      value={subgoal}
                      onChange={(event) => updateSubgoal(index, event.target.value)}
                      placeholder={`Subgoal ${index + 1}`}
                    />
                    {subgoalTitles.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        className="shrink-0 px-2 text-slate-500 hover:text-rose-300"
                        aria-label={`Remove subgoal ${index + 1}`}
                        onClick={() => removeSubgoalField(index)}
                      >
                        <Trash2 size={16} />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {error && (
          <p className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-3 py-2.5 text-sm text-rose-200" role="alert">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-3 border-t border-slate-800 pt-5">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSaving}>
            {isSaving ? 'Saving...' : isEditingMission ? 'Save mission' : isMission ? 'Create mission' : 'Create goal'}
          </Button>
        </div>
      </form>
    </Dialog>
  )
}

export default GoalDialog
