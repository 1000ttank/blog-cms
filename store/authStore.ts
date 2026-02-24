import { create } from 'zustand'
import type { GitHubConfig, GitHubUser } from '@/types'
import { saveToken, loadToken, saveConfig, loadConfig, clearEncryptionKey } from '@/lib/crypto'
import { createGitHubClient, resetGitHubClient, getGitHubClient } from '@/services/githubClient'
import { createPostService } from '@/services/postService'
import { createActionsService, resetActionsService } from '@/services/actionsService'

interface AuthStore {
  isAuthenticated: boolean
  isLoading: boolean
  token: string | null
  config: GitHubConfig | null
  user: GitHubUser | null

  login(token: string, config: GitHubConfig): Promise<void>
  logout(): void
  validateToken(): Promise<boolean>
  restoreSession(): Promise<void>
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  isAuthenticated: false,
  isLoading: false,
  token: null,
  config: null,
  user: null,

  async login(token: string, config: GitHubConfig) {
    set({ isLoading: true })
    try {
      const client = createGitHubClient({ ...config, token })
      createPostService(client)
      createActionsService({ ...config, token })

      const user = await client.getAuthenticatedUser()

      await saveToken(token)
      saveConfig(config as unknown as Record<string, unknown>)

      set({
        isAuthenticated: true,
        isLoading: false,
        token,
        config: { ...config, token },
        user,
      })
    } catch (error) {
      set({ isLoading: false })
      resetGitHubClient()
      throw error
    }
  },

  logout() {
    clearEncryptionKey()
    resetGitHubClient()
    resetActionsService()
    set({
      isAuthenticated: false,
      isLoading: false,
      token: null,
      config: null,
      user: null,
    })
  },

  async validateToken(): Promise<boolean> {
    const { token, config } = get()
    if (!token || !config) return false

    try {
      const client = getGitHubClient()
      return await client.validateToken()
    } catch {
      return false
    }
  },

  async restoreSession() {
    set({ isLoading: true })
    try {
      const token = await loadToken()
      const config = loadConfig<GitHubConfig>()

      if (!token || !config) {
        set({ isLoading: false })
        return
      }

      const fullConfig = { ...config, token }
      const client = createGitHubClient(fullConfig)
      createPostService(client)
      createActionsService(fullConfig)

      const isValid = await client.validateToken()
      if (!isValid) {
        clearEncryptionKey()
        resetGitHubClient()
        set({ isLoading: false })
        return
      }

      const user = await client.getAuthenticatedUser()

      set({
        isAuthenticated: true,
        isLoading: false,
        token,
        config: fullConfig,
        user,
      })
    } catch {
      clearEncryptionKey()
      resetGitHubClient()
      set({ isLoading: false })
    }
  },
}))
