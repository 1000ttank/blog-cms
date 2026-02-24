import { create } from 'zustand'
import type { Post, PostInput, PostListItem, PostStatus } from '@/types'
import { getPostService } from '@/services/postService'

interface PostStore {
  posts: PostListItem[]
  currentPost: Post | null
  isLoading: boolean
  isSaving: boolean
  error: string | null
  filter: PostStatus

  fetchPosts(status?: PostStatus): Promise<void>
  fetchPost(path: string): Promise<void>
  createPost(input: PostInput): Promise<Post>
  updatePost(path: string, input: PostInput, sha: string): Promise<Post>
  deletePost(path: string, sha: string): Promise<void>
  publishDraft(draftPath: string, sha: string): Promise<Post>
  unpublishPost(postPath: string, sha: string): Promise<Post>
  setFilter(filter: PostStatus): void
  clearCurrentPost(): void
  clearError(): void
}

export const usePostStore = create<PostStore>((set, get) => ({
  posts: [],
  currentPost: null,
  isLoading: false,
  isSaving: false,
  error: null,
  filter: 'all',

  async fetchPosts(status?: PostStatus) {
    const targetStatus = status ?? get().filter
    set({ isLoading: true, error: null })
    try {
      const service = getPostService()
      const posts = await service.getPosts(targetStatus)
      set({ posts, isLoading: false })
    } catch (error) {
      set({ isLoading: false, error: (error as Error).message })
    }
  },

  async fetchPost(path: string) {
    // Clear currentPost immediately so PostEditor doesn't render with stale data
    set({ isLoading: true, error: null, currentPost: null })
    try {
      const service = getPostService()
      const post = await service.getPost(path)
      set({ currentPost: post, isLoading: false })
    } catch (error) {
      set({ isLoading: false, error: (error as Error).message })
    }
  },

  async createPost(input: PostInput): Promise<Post> {
    set({ isSaving: true, error: null })
    try {
      const service = getPostService()
      const post = await service.createPost(input)
      set({
        isSaving: false,
        posts: [],
        currentPost: post,
      })
      // Re-fetch list
      await get().fetchPosts()
      return post
    } catch (error) {
      set({ isSaving: false, error: (error as Error).message })
      throw error
    }
  },

  async updatePost(path: string, input: PostInput, sha: string): Promise<Post> {
    set({ isSaving: true, error: null })
    try {
      const service = getPostService()
      const post = await service.updatePost(path, input, sha)
      set({ isSaving: false, currentPost: post })
      await get().fetchPosts()
      return post
    } catch (error) {
      set({ isSaving: false, error: (error as Error).message })
      throw error
    }
  },

  async deletePost(path: string, sha: string): Promise<void> {
    set({ isLoading: true, error: null })
    try {
      const service = getPostService()
      await service.deletePost(path, sha)
      set((state) => ({
        isLoading: false,
        posts: state.posts.filter((p) => p.path !== path),
        currentPost: state.currentPost?.path === path ? null : state.currentPost,
      }))
    } catch (error) {
      set({ isLoading: false, error: (error as Error).message })
      throw error
    }
  },

  async publishDraft(draftPath: string, sha: string): Promise<Post> {
    set({ isSaving: true, error: null })
    try {
      const service = getPostService()
      const post = await service.publishDraft(draftPath, sha)
      set({ isSaving: false })
      await get().fetchPosts()
      return post
    } catch (error) {
      set({ isSaving: false, error: (error as Error).message })
      throw error
    }
  },

  async unpublishPost(postPath: string, sha: string): Promise<Post> {
    set({ isSaving: true, error: null })
    try {
      const service = getPostService()
      const post = await service.unpublishPost(postPath, sha)
      set({ isSaving: false })
      await get().fetchPosts()
      return post
    } catch (error) {
      set({ isSaving: false, error: (error as Error).message })
      throw error
    }
  },

  setFilter(filter: PostStatus) {
    set({ filter })
    get().fetchPosts(filter)
  },

  clearCurrentPost() {
    set({ currentPost: null })
  },

  clearError() {
    set({ error: null })
  },
}))
