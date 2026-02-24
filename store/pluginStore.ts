import { create } from 'zustand'
import type { CMSPlugin, PluginRegistry } from '@/types'

interface PluginStore {
  plugins: PluginRegistry

  registerPlugin(plugin: CMSPlugin): Promise<void>
  unregisterPlugin(name: string): void
  enablePlugin(name: string): void
  disablePlugin(name: string): void
  getPlugin(name: string): CMSPlugin | undefined
  getEnabledPlugins(): CMSPlugin[]
}

export const usePluginStore = create<PluginStore>((set, get) => ({
  plugins: {},

  async registerPlugin(plugin: CMSPlugin) {
    if (plugin.init) {
      await plugin.init()
    }
    set((state) => ({
      plugins: {
        ...state.plugins,
        [plugin.name]: { ...plugin, enabled: true },
      },
    }))
  },

  unregisterPlugin(name: string) {
    set((state) => {
      const next = { ...state.plugins }
      delete next[name]
      return { plugins: next }
    })
  },

  enablePlugin(name: string) {
    set((state) => ({
      plugins: {
        ...state.plugins,
        [name]: state.plugins[name]
          ? { ...state.plugins[name], enabled: true }
          : state.plugins[name],
      },
    }))
  },

  disablePlugin(name: string) {
    set((state) => ({
      plugins: {
        ...state.plugins,
        [name]: state.plugins[name]
          ? { ...state.plugins[name], enabled: false }
          : state.plugins[name],
      },
    }))
  },

  getPlugin(name: string) {
    return get().plugins[name]
  },

  getEnabledPlugins() {
    return Object.values(get().plugins).filter((p) => p.enabled)
  },
}))
