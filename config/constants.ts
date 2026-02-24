export const APP_NAME = 'Blogo CMS'
export const APP_VERSION = '0.1.0'
export const APP_DESCRIPTION = 'A serverless CMS for Hexo blogs powered by Next.js + GitHub API'

// ─── Version Check ────────────────────────────────────────────────────────────

export const GITHUB_OWNER = '1000ttank'
export const GITHUB_REPO_CMS = 'Hexo-NX-CMS'
export const NPM_PACKAGE_NAME = 'hexo-nx-cms'

export const VERSION_CHECK = {
  GITHUB_API: `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO_CMS}/releases/latest`,
  NPM_API: `https://registry.npmjs.org/${NPM_PACKAGE_NAME}/latest`,
  CACHE_KEY: 'cms-version-check-cache',
  DISMISS_KEY: 'cms-version-dismiss',
  CACHE_TTL: 24 * 60 * 60 * 1000,
} as const

export const STORAGE_KEYS = {
  ENCRYPTED_TOKEN: 'hexo_nx_cms_token',
  ENCRYPTION_KEY: 'hexo_nx_cms_key',
  GITHUB_CONFIG: 'hexo_nx_cms_config',
} as const

export const GITHUB_API_BASE = 'https://api.github.com'

export const HEXO_PATHS = {
  POSTS: 'source/_posts',
  DRAFTS: 'source/_drafts',
  ASSETS: 'source/assets',
  CONFIG: '_config.yml',
  THEMES: 'themes',
} as const

export const FRONTMATTER_DEFAULTS = {
  layout: 'post',
  draft: false,
} as const

export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  DASHBOARD: '/dashboard',
  POSTS: '/posts',
  EDITOR: '/editor',
  EDITOR_NEW: '/editor/new',
  THEMES: '/config',
  CONFIG: '/config',
  FONTS: '/fonts',
  BUILDS: '/builds',
  SETTINGS: '/settings',
  GUIDE: '/guide',
} as const

export const QUERY_KEYS = {
  POSTS: 'posts',
  POST: 'post',
  THEMES: 'themes',
  GITHUB_USER: 'github-user',
} as const
