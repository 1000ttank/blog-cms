import type { ReactNode } from 'react'

// ─── GitHub Configuration ────────────────────────────────────────────────────

export interface GitHubConfig {
  owner: string
  repo: string
  branch: string
  token: string
}

export interface GitHubUser {
  login: string
  name: string | null
  avatar_url: string
  html_url: string
  email: string | null
  public_repos: number
}

export interface GitHubFile {
  name: string
  path: string
  sha: string
  size: number
  type: 'file' | 'dir' | 'symlink' | 'submodule'
  download_url: string | null
  content?: string
  encoding?: string
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export interface AuthState {
  isAuthenticated: boolean
  token: string | null
  config: GitHubConfig | null
  user: GitHubUser | null
}

// ─── Post / Frontmatter ───────────────────────────────────────────────────────

export interface PostFrontmatter {
  title: string
  date: string
  updated?: string
  tags?: string[]
  categories?: string[]
  draft?: boolean
  description?: string
  cover?: string
  slug?: string
  permalink?: string
  [key: string]: unknown
}

export interface Post {
  /** GitHub file path, e.g. source/_posts/hello-world.md */
  path: string
  /** File SHA – required for update/delete */
  sha: string
  /** Filename without directory */
  filename: string
  /** Slug derived from filename */
  slug: string
  frontmatter: PostFrontmatter
  /** Raw Markdown body (without frontmatter) */
  body: string
  /** Full raw content including frontmatter */
  raw: string
  isDraft: boolean
  createdAt: string
  updatedAt?: string
}

export interface PostInput {
  title: string
  body: string
  tags?: string[]
  categories?: string[]
  draft?: boolean
  description?: string
  cover?: string
  slug?: string
}

export interface PostListItem {
  path: string
  sha: string
  filename: string
  slug: string
  title: string
  date: string
  tags: string[]
  categories: string[]
  isDraft: boolean
  description?: string
}

// ─── Plugin System ────────────────────────────────────────────────────────────

export interface CMSPlugin {
  name: string
  version: string
  description?: string
  enabled: boolean

  /** Called once when the plugin is registered */
  init?(): void | Promise<void>

  /** Called after a post is created */
  onPostCreate?(post: Post): void | Promise<void>

  /** Called after a post is updated */
  onPostUpdate?(post: Post): void | Promise<void>

  /** Called before a post is deleted */
  onPostDelete?(path: string): void | Promise<void>

  /** Return a React node to extend the sidebar */
  extendSidebar?(): ReactNode

  /** Return a React node to extend the settings page */
  extendSettings?(): ReactNode
}

export interface PluginRegistry {
  [pluginName: string]: CMSPlugin
}

// ─── Theme ────────────────────────────────────────────────────────────────────

export interface HexoTheme {
  name: string
  path: string
  /** Whether this is the currently active theme */
  active: boolean
  /** Parsed _config.yml of the theme if available */
  config?: Record<string, unknown>
}

// ─── Image Service ────────────────────────────────────────────────────────────

export type ImageProvider = 'github' | 'smms' | 's3'

export interface ImageUploadResult {
  url: string
  filename: string
  provider: ImageProvider
}

// ─── Comment System ───────────────────────────────────────────────────────────

export type CommentProvider = 'giscus' | 'utterances' | 'disqus' | 'none'

export interface CommentConfig {
  provider: CommentProvider
  enabled: boolean
  giscus?: {
    repo: string
    repoId: string
    category: string
    categoryId: string
    mapping: string
    reactionsEnabled: boolean
    emitMetadata: boolean
    theme: string
  }
  utterances?: {
    repo: string
    issueTerm: string
    theme: string
  }
  disqus?: {
    shortname: string
  }
}

// ─── Analytics ────────────────────────────────────────────────────────────────

export type AnalyticsProvider = 'google' | 'umami' | 'none'

export interface AnalyticsConfig {
  provider: AnalyticsProvider
  enabled: boolean
  googleAnalyticsId?: string
  umamiWebsiteId?: string
  umamiSrc?: string
}

// ─── UI State ────────────────────────────────────────────────────────────────

export interface UIState {
  sidebarOpen: boolean
  theme: 'light' | 'dark' | 'system'
  loading: boolean
  loadingMessage?: string
}

// ─── API Response Wrappers ────────────────────────────────────────────────────

export interface ApiResult<T> {
  data: T | null
  error: string | null
  success: boolean
}

export type PostStatus = 'published' | 'draft' | 'all'
