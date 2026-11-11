import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Save, Download, Upload, Trash2, AlertCircle, RefreshCw } from 'lucide-react'
import { useRewardStore } from '../rewards/reward.store'
import { getSettings, saveSettings, DEFAULT_USER_SETTINGS } from '../../db/repositories/settingsRepository'
import { db, exportAllData, importAllData } from '../../db/database'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import { Dialog } from '../../components/ui/Dialog'
import { FormField } from '../../components/ui/FormField'

export function SettingsPage() {
  const navigate = useNavigate()
  const refreshMetrics = useRewardStore((state) => state.refreshMetrics)

  const [settings, setSettings] = useState<{
    focusDuration: number
    breakDuration: number
    dailyFocusTarget: number
    soundEnabled: boolean
    theme: 'dark' | 'light' | 'system'
  }>({
    focusDuration: DEFAULT_USER_SETTINGS.focusDuration,
    breakDuration: DEFAULT_USER_SETTINGS.breakDuration,
    dailyFocusTarget: DEFAULT_USER_SETTINGS.dailyFocusTarget,
    soundEnabled: DEFAULT_USER_SETTINGS.soundEnabled,
    theme: DEFAULT_USER_SETTINGS.theme,
  })
  const [saving, setSaving] = useState(false)
  const [openClear, setOpenClear] = useState(false)
  const [openImport, setOpenImport] = useState(false)
  const [importError, setImportError] = useState('')
  const [clearError, setClearError] = useState('')
  const [message, setMessage] = useState<{ kind: 'info' | 'error'; text: string } | null>(null)
  const optionClass = (selected: boolean) => `rounded-xl border px-3 py-2 text-sm transition-colors ${
    selected
      ? 'border-emerald-400 bg-emerald-500/10 text-emerald-200'
      : 'border-slate-700 bg-slate-950/50 text-slate-300 hover:border-slate-500'
  }`

  useEffect(() => {
    let mounted = true
    getSettings().then((loaded) => {
      if (!mounted) return
      if (loaded) {
        setSettings({
          focusDuration: loaded.focusDuration,
          breakDuration: loaded.breakDuration,
          dailyFocusTarget: loaded.dailyFocusTarget,
          soundEnabled: loaded.soundEnabled,
          theme: loaded.theme,
        })
      }
    })
    return () => {
      mounted = false
    }
  }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      await saveSettings({
        focusDuration: settings.focusDuration,
        breakDuration: settings.breakDuration,
        dailyFocusTarget: settings.dailyFocusTarget,
        soundEnabled: settings.soundEnabled,
        theme: settings.theme,
      })
      window.dispatchEvent(new Event('pomo-settings-updated'))
      setMessage({ kind: 'info', text: 'Settings saved.' })
    } catch {
      setMessage({ kind: 'error', text: 'Failed to save settings.' })
    } finally {
      setSaving(false)
    }
  }

  const handleExport = async () => {
    try {
      const data = await exportAllData()
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `pomo-focus-export-${new Date().toISOString().slice(0, 10)}.json`
      document.body.appendChild(anchor)
      anchor.click()
      document.body.removeChild(anchor)
      URL.revokeObjectURL(url)
      setMessage({ kind: 'info', text: 'Data exported.' })
    } catch {
      setMessage({ kind: 'error', text: 'Export failed.' })
    }
  }

  const handleImportFile = (file: File) => {
    const reader = new FileReader()
    reader.onload = async (event) => {
      try {
        const data = JSON.parse((event.target?.result as string) ?? '{}')
        await importAllData(data)
        await refreshMetrics()
        setOpenImport(false)
        setImportError('')
        setMessage({ kind: 'info', text: 'Data imported.' })
      } catch {
        setImportError('Import failed. Choose a valid Pomo Focus JSON backup.')
      }
    }
    reader.readAsText(file)
  }

  const handleClearAll = async () => {
    try {
      const tables = [
        db.monthlyMissions,
        db.dailyGoals,
        db.subgoals,
        db.focusSessions,
        db.distractions,
        db.dailyReviews,
        db.weeklyReviews,
        db.milestones,
        db.userSettings,
      ]
      await db.transaction('rw', tables, async () => {
        for (const table of tables) {
          await table.clear()
        }
      })
      await saveSettings(DEFAULT_USER_SETTINGS)
      setOpenClear(false)
      setClearError('')
      setMessage({ kind: 'info', text: 'All data cleared.' })
    } catch {
      setClearError('Could not clear data. Please try again.')
    }
  }

  const handleResetStreaks = async () => {
    try {
      await db.transaction('rw', [db.milestones, db.dailyReviews, db.weeklyReviews], async () => {
        await db.milestones.clear()
        await db.dailyReviews.clear()
        await db.weeklyReviews.clear()
      })
      await refreshMetrics()
      setMessage({ kind: 'info', text: 'Streaks and reviews reset.' })
    } catch {
      setMessage({ kind: 'error', text: 'Reset failed.' })
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Button variant="ghost" onClick={() => navigate('/')}>
          <AlertCircle size={16} className="mr-2" /> Back to today
        </Button>
        <h1 className="text-2xl font-semibold tracking-tight text-white">Settings</h1>
      </div>

      {message && (
        <div
          className={`rounded-lg border p-3 text-xs ${
            message.kind === 'error'
              ? 'border-rose-500/30 bg-rose-500/10 text-rose-300'
              : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
          }`}
        >
          {message.text}
        </div>
      )}

      <Card>
        <h2 className="text-sm font-semibold text-slate-200 mb-4">Session settings</h2>
        <div className="space-y-4">
          <FormField label="Focus duration (minutes)">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" role="group" aria-label="Focus duration">
              {[25, 50, 75].map((minutes) => (
                <button
                  key={minutes}
                  type="button"
                  aria-pressed={settings.focusDuration === minutes}
                  onClick={() => setSettings({ ...settings, focusDuration: minutes })}
                  className={optionClass(settings.focusDuration === minutes)}
                >
                  {minutes} min
                </button>
              ))}
              <button
                type="button"
                aria-pressed={!([25, 50, 75].includes(settings.focusDuration))}
                onClick={() => setSettings({ ...settings, focusDuration: [25, 50, 75].includes(settings.focusDuration) ? 60 : settings.focusDuration })}
                className={optionClass(!([25, 50, 75].includes(settings.focusDuration)))}
              >
                Custom
              </button>
            </div>
          </FormField>
          {!([25, 50, 75].includes(settings.focusDuration)) && (
            <FormField label="Custom focus duration (minutes)">
              <input
                type="number"
                min="1"
                max="300"
                value={String(settings.focusDuration)}
                onChange={(e) => setSettings({
                  ...settings,
                  focusDuration: Math.max(1, Number(e.target.value) || 1),
                })}
                className="w-full max-w-xs rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </FormField>
          )}
          <FormField label="Break duration (minutes)">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" role="group" aria-label="Break duration">
              {[5, 10, 15, 20].map((minutes) => (
                <button
                  key={minutes}
                  type="button"
                  aria-pressed={settings.breakDuration === minutes}
                  onClick={() => setSettings({ ...settings, breakDuration: minutes })}
                  className={optionClass(settings.breakDuration === minutes)}
                >
                  {minutes} min
                </button>
              ))}
            </div>
          </FormField>
          <FormField label="Daily focus target (minutes)">
            <input
              type="number"
              min="1"
              value={String(settings.dailyFocusTarget)}
              onChange={(e) =>
                setSettings({ ...settings, dailyFocusTarget: Math.max(1, Number(e.target.value) || 1) })
              }
              className="w-full max-w-xs rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </FormField>
          <FormField label="Sound">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.soundEnabled}
                onChange={(e) =>
                  setSettings({ ...settings, soundEnabled: e.target.checked })
                }
                className="rounded text-emerald-400 accent-emerald-500"
              />
              <span className="text-sm text-slate-300">Play gentle tones on session events</span>
            </label>
          </FormField>
          <FormField label="Theme">
            <div className="grid grid-cols-3 gap-2" role="group" aria-label="Theme">
              {(['system', 'dark', 'light'] as const).map((theme) => (
                <button
                  key={theme}
                  type="button"
                  aria-pressed={settings.theme === theme}
                  onClick={() => setSettings({ ...settings, theme })}
                  className={optionClass(settings.theme === theme)}
                >
                  {theme === 'system' ? 'System' : theme === 'dark' ? 'Dark' : 'Light'}
                </button>
              ))}
            </div>
          </FormField>
          <Button onClick={handleSave} disabled={saving} className="w-full">
            {saving ? 'Saving…' : <><Save size={16} className="mr-2" /> Save settings</>}
          </Button>
        </div>
      </Card>

      <Card>
        <h2 className="text-sm font-semibold text-slate-200 mb-4">Data &amp; privacy</h2>
        <p className="text-sm text-slate-400 mb-4">
          Your data is saved automatically on this device, so closing the app is safe. The browser may show a standard leave prompt; choose Leave to close. Export a JSON backup before clearing browser data or moving to another device.
        </p>
        <div className="space-y-2">
          <Button
            variant="ghost"
            onClick={handleExport}
            className="w-full justify-start"
          >
            <Download size={16} className="mr-2" /> Export data to JSON
          </Button>
          <Button
            variant="ghost"
            onClick={() => { setImportError(''); setOpenImport(true) }}
            className="w-full justify-start"
          >
            <Upload size={16} className="mr-2" /> Import data from JSON
          </Button>
          <Button
            variant="ghost"
            onClick={handleResetStreaks}
            className="w-full justify-start text-rose-400 hover:text-rose-300"
          >
            <RefreshCw size={16} className="mr-2" /> Reset streaks &amp; reviews
          </Button>
          <Button
            variant="ghost"
            onClick={() => { setClearError(''); setOpenClear(true) }}
            className="w-full justify-start text-rose-400 hover:text-rose-300"
          >
            <Trash2 size={16} className="mr-2" /> Clear all data
          </Button>
        </div>
      </Card>

      <Dialog
        open={openImport}
        onClose={() => setOpenImport(false)}
        title="Import data"
        description="Choose a previously exported JSON file. Importing replaces the data currently stored on this device."
        size="md"
      >
        <input
          type="file"
          accept=".json"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) {
              setImportError('')
              handleImportFile(file)
            }
          }}
          className="block w-full text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border file:border-slate-700 file:bg-slate-800 file:text-slate-200 hover:file:bg-slate-700 cursor-pointer"
        />
        {importError && <p className="text-sm text-rose-300" role="alert">{importError}</p>}
        <div className="mt-4 flex justify-end">
          <Button variant="ghost" onClick={() => setOpenImport(false)}>
            Cancel
          </Button>
        </div>
      </Dialog>

      <Dialog
        open={openClear}
        onClose={() => setOpenClear(false)}
        title="Clear all data"
        description="This permanently deletes every goal, session, distraction, review, and milestone stored on this device. It cannot be undone without an exported backup."
        size="sm"
      >
        {clearError && <p className="text-sm text-rose-300" role="alert">{clearError}</p>}
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setOpenClear(false)}>
            Cancel
          </Button>
          <Button variant="ghost" className="text-rose-400 hover:bg-rose-500/10" onClick={handleClearAll}>
            Clear everything
          </Button>
        </div>
      </Dialog>
    </div>
  )
}
