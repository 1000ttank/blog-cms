/**
 * 图片上传状态管理
 */

import { create } from 'zustand'
import type { ImageHostingConfig, UploadResult } from '@/types/imageHosting'
import { DEFAULT_IMAGE_HOSTING_CONFIG } from '@/types/imageHosting'
import { GitHubImageHosting } from '@/services/imageHosting/githubImageHosting'
import { generateImageUrl } from '@/services/imageHosting/urlGenerator'
import { useAuthStore } from './authStore'

interface ImageStore {
  config: ImageHostingConfig | null
  uploadHistory: UploadResult[]
  isUploading: boolean
  uploadProgress: number

  loadConfig(): void
  saveConfig(config: ImageHostingConfig): void
  uploadImage(file: File): Promise<UploadResult>
  getHistory(): UploadResult[]
  clearHistory(): void
}

const STORAGE_KEY_CONFIG = 'image_hosting_config'
const STORAGE_KEY_HISTORY = 'image_upload_history'

export const useImageStore = create<ImageStore>((set, get) => ({
  config: null,
  uploadHistory: [],
  isUploading: false,
  uploadProgress: 0,

  loadConfig() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_CONFIG)
      if (saved) {
        const config = JSON.parse(saved)
        set({ config })
      }

      const history = localStorage.getItem(STORAGE_KEY_HISTORY)
      if (history) {
        set({ uploadHistory: JSON.parse(history) })
      }
    } catch (error) {
      console.error('Failed to load image hosting config:', error)
    }
  },

  saveConfig(config: ImageHostingConfig) {
    set({ config })
    localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(config))
  },

  async uploadImage(file: File): Promise<UploadResult> {
    const { config } = get()
    const { token } = useAuthStore.getState()

    if (!config) {
      throw new Error('未配置图床')
    }

    if (!token) {
      throw new Error('未登录')
    }

    set({ isUploading: true, uploadProgress: 0 })

    try {
      const hosting = new GitHubImageHosting(token, config)

      const result = await hosting.upload(file, (percent) => {
        set({ uploadProgress: percent })
      })

      // 生成完整的 URL
      const url = generateImageUrl(config, result.path)
      const fullResult: UploadResult = {
        ...result,
        url,
      }

      // 添加到历史记录
      set((state) => {
        const newHistory = [fullResult, ...state.uploadHistory].slice(0, 50) // 只保留最近 50 条
        localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(newHistory))
        return {
          uploadHistory: newHistory,
          isUploading: false,
          uploadProgress: 100,
        }
      })

      return fullResult
    } catch (error) {
      set({ isUploading: false, uploadProgress: 0 })
      throw error
    }
  },

  getHistory() {
    return get().uploadHistory
  },

  clearHistory() {
    set({ uploadHistory: [] })
    localStorage.removeItem(STORAGE_KEY_HISTORY)
  },
}))

// 初始化时加载配置
if (typeof window !== 'undefined') {
  useImageStore.getState().loadConfig()
}
