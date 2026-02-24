import { create } from 'zustand'
import type { UIState } from '@/types'

interface UIStore extends UIState {
  setSidebarOpen(open: boolean): void
  toggleSidebar(): void
  setTheme(theme: UIState['theme']): void
  setLoading(loading: boolean, message?: string): void
}

export const useUIStore = create<UIStore>((set) => ({
  sidebarOpen: true,
  theme: 'system',
  loading: false,
  loadingMessage: undefined,

  setSidebarOpen(open: boolean) {
    set({ sidebarOpen: open })
  },

  toggleSidebar() {
    set((state) => ({ sidebarOpen: !state.sidebarOpen }))
  },

  setTheme(theme: UIState['theme']) {
    set({ theme })
    if (typeof window !== 'undefined') {
      const root = document.documentElement
      root.classList.remove('light', 'dark')
      if (theme === 'system') {
        const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches
        root.classList.add(systemDark ? 'dark' : 'light')
      } else {
        root.classList.add(theme)
      }
    }
  },

  setLoading(loading: boolean, message?: string) {
    set({ loading, loadingMessage: loading ? message : undefined })
  },
}))
