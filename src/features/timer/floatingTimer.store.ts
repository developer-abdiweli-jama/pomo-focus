import { create } from 'zustand'

type DocumentPipWindow = Window & {
  documentPictureInPicture?: {
    requestWindow: (options?: { width?: number; height?: number }) => Promise<Window>
  }
}

export function isFloatingTimerSupported() {
  return typeof window !== 'undefined' && Boolean((window as DocumentPipWindow).documentPictureInPicture)
}

interface FloatingTimerStore {
  readonly window: Window | null
  readonly error: string
  open: () => Promise<void>
  close: () => void
}

export const useFloatingTimerStore = create<FloatingTimerStore>((set, get) => ({
  window: null,
  error: '',

  open: async () => {
    const pipApi = (window as DocumentPipWindow).documentPictureInPicture
    if (!pipApi) {
      set({ error: 'Floating timers are not supported by this browser.' })
      return
    }
    if (get().window && !get().window?.closed) return
    set({ error: '' })
    try {
      const floatingWindow = await pipApi.requestWindow({ width: 300, height: 190 })
      floatingWindow.document.title = 'FocusSpan timer'
      floatingWindow.document.documentElement.style.background = '#0b1220'
      floatingWindow.document.body.style.cssText = 'margin:0;background:#0b1220;color:#f8fafc;font-family:system-ui,-apple-system,sans-serif;'
      floatingWindow.addEventListener('pagehide', () => set({ window: null }), { once: true })
      set({ window: floatingWindow })
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Could not open the floating timer.' })
    }
  },

  close: () => {
    const floatingWindow = get().window
    if (floatingWindow && !floatingWindow.closed) floatingWindow.close()
    set({ window: null })
  },
}))
