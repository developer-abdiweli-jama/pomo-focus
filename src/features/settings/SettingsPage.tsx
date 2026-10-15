import { useLiveQuery } from 'dexie-react-hooks'
import { Download, Trash2, Upload } from 'lucide-react'
import { useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import { clearDatabase, exportDatabase, importDatabase } from '../../db/backupRepository'
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

      {storedSettings ? <SettingsForm key={`${storedSettings.focusDurationSeconds}-${storedSettings.breakDurationSeconds}-${storedSettings.dailyFocusTargetMinutes}`} settings={storedSettings} /> : <Card><p className="text-sm text-slate-400">Loading settings...</p></Card>}
    </section>
  )
}

function SettingsForm({ settings }: { settings: UserSettings }) {
  const [focusMinutes, setFocusMinutes] = useState(String(settings.focusDurationSeconds / 60))
  const [breakMinutes, setBreakMinutes] = useState(String(settings.breakDurationSeconds / 60))
  const [dailyTargetMinutes, setDailyTargetMinutes] = useState(String(settings.dailyFocusTargetMinutes))
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [backupState, setBackupState] = useState('')
  const importInputRef = useRef<HTMLInputElement>(null)

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

  async function handleExport(): Promise<void> {
    try {
      const backup = await exportDatabase()
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `pomo-focus-backup-${new Date().toISOString().slice(0, 10)}.json`
      link.click()
      URL.revokeObjectURL(url)
      setBackupState('Backup downloaded.')
    } catch {
      setBackupState('Could not export your data.')
    }
  }

  async function handleImport(event: ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    try {
      await importDatabase(JSON.parse(await file.text()))
      setBackupState('Backup restored.')
    } catch (caughtError) {
      setBackupState(caughtError instanceof Error ? caughtError.message : 'Could not restore this backup.')
    }
  }

  async function handleClear(): Promise<void> {
    if (!window.confirm('Clear all local Pomo Focus data? This cannot be undone without a backup.')) return

    await clearDatabase()
    setBackupState('Local data cleared.')
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

      <div className="mt-8 border-t border-slate-800 pt-6">
        <h2 className="text-base font-semibold text-white">Local data</h2>
        <p className="mt-2 text-sm leading-6 text-slate-400">Your goals, sessions, reviews, and settings stay in this browser. Export a backup before clearing browser data.</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Button type="button" variant="secondary" onClick={() => void handleExport}><Download size={15} className="mr-2" /> Export backup</Button>
          <Button type="button" variant="ghost" onClick={() => importInputRef.current?.click()}><Upload size={15} className="mr-2" /> Import backup</Button>
          <Button type="button" variant="ghost" className="text-rose-300 hover:text-rose-200" onClick={() => void handleClear}><Trash2 size={15} className="mr-2" /> Clear local data</Button>
          <input ref={importInputRef} className="hidden" type="file" accept="application/json" onChange={(event) => void handleImport(event)} />
        </div>
        {backupState && <p className="mt-3 text-xs text-slate-400" role="status">{backupState}</p>}
      </div>
    </Card>
  )
}

export default SettingsPage
