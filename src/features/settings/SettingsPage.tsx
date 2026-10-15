import { useLiveQuery } from 'dexie-react-hooks'
import { useState, type FormEvent } from 'react'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import { getSettings, updateSettings } from '../../db/repositories/settingsRepository'
import type { UserSettings } from '../../domain/models'

const inputClasses =
  'mt-2 w-full rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2.5 text-sm text-slate-100 outline-none transition-colors placeholder:text-slate-600 focus:border-emerald-400'

function SettingsPage() {
  const storedSettings = useLiveQuery(getSettings, [])

  return (
    <section className="max-w-2xl">
      <div className="mb-8">
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-300/80">Settings</p>
        <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">Shape the rhythm.</h1>
        <p className="mt-3 text-[15px] leading-7 text-slate-400">
          Choose the focus and recovery rhythm that fits your real work. These settings apply to new sessions.
        </p>
      </div>

      {storedSettings ? <SettingsForm settings={storedSettings} /> : <Card><p className="text-sm text-slate-400">Loading settings...</p></Card>}
    </section>
  )
}

function SettingsForm({ settings }: { settings: UserSettings }) {
  const [focusMinutes, setFocusMinutes] = useState(String(settings.focusDurationSeconds / 60))
  const [breakMinutes, setBreakMinutes] = useState(String(settings.breakDurationSeconds / 60))
  const [dailyTargetMinutes, setDailyTargetMinutes] = useState(String(settings.dailyFocusTargetMinutes))
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    setSaveState('saving')

    try {
      await updateSettings({
        focusDurationSeconds: Number(focusMinutes) * 60,
        breakDurationSeconds: Number(breakMinutes) * 60,
        dailyFocusTargetMinutes: Number(dailyTargetMinutes),
      })
      setSaveState('saved')
    } catch {
      setSaveState('error')
    }
  }

  return (
    <Card>
      <form className="space-y-5" onSubmit={handleSubmit}>
        <label className="block text-sm font-medium text-slate-300">
          Focus length (minutes)
          <input className={inputClasses} type="number" min="1" step="1" value={focusMinutes} onChange={(event) => setFocusMinutes(event.target.value)} />
          <span className="mt-1 block text-xs font-normal text-slate-500">How long a new focus session runs.</span>
        </label>

        <label className="block text-sm font-medium text-slate-300">
          Break length (minutes)
          <input className={inputClasses} type="number" min="1" step="1" value={breakMinutes} onChange={(event) => setBreakMinutes(event.target.value)} />
          <span className="mt-1 block text-xs font-normal text-slate-500">The break is offered after a session and never starts automatically.</span>
        </label>

        <label className="block text-sm font-medium text-slate-300">
          Daily focus target (minutes)
          <input className={inputClasses} type="number" min="1" step="1" value={dailyTargetMinutes} onChange={(event) => setDailyTargetMinutes(event.target.value)} />
          <span className="mt-1 block text-xs font-normal text-slate-500">A day counts toward your streak after completed focus time reaches this target.</span>
        </label>

        <div className="flex items-center justify-end gap-3 border-t border-slate-800 pt-5">
          {saveState === 'saved' && <span className="text-xs text-emerald-300" role="status">Saved locally.</span>}
          {saveState === 'error' && <span className="text-xs text-rose-300" role="alert">Could not save these settings.</span>}
          <Button type="submit" disabled={saveState === 'saving'}>{saveState === 'saving' ? 'Saving...' : 'Save settings'}</Button>
        </div>
      </form>
    </Card>
  )
}

export default SettingsPage
