import { Octokit } from '@octokit/rest'
import type { GitHubConfig, GitHubFile, GitHubUser } from '@/types'

export class GitHubClient {
  private octokit: Octokit
  private config: GitHubConfig

  constructor(config: GitHubConfig) {
    this.config = config
    this.octokit = new Octokit({ auth: config.token })
  }

  // ─── Auth ─────────────────────────────────────────────────────────────────

  async getAuthenticatedUser(): Promise<GitHubUser> {
    const { data } = await this.octokit.rest.users.getAuthenticated()
    return {
      login: data.login,
      name: data.name ?? null,
      avatar_url: data.avatar_url,
      html_url: data.html_url,
      email: data.email ?? null,
      public_repos: data.public_repos,
    }
  }

  async validateToken(): Promise<boolean> {
    try {
      await this.getAuthenticatedUser()
      return true
    } catch {
      return false
    }
  }

  // ─── File Operations ──────────────────────────────────────────────────────

  /**
   * Get a single file's content (decoded from Base64).
   */
  async getFile(path: string): Promise<{ content: string; sha: string }> {
    const { data } = await this.octokit.rest.repos.getContent({
      owner: this.config.owner,
      repo: this.config.repo,
      path,
      ref: this.config.branch,
    })

    if (Array.isArray(data)) {
      throw new Error(`Path "${path}" is a directory, not a file`)
    }

    if (data.type !== 'file') {
      throw new Error(`Path "${path}" is not a file`)
    }

    const file = data as { content: string; sha: string; encoding: string }
    const content = Buffer.from(file.content, 'base64').toString('utf-8')

    return { content, sha: data.sha }
  }

  /**
   * Get directory listing.
   * Returns an empty array if the directory does not exist (HTTP 404),
   * so callers never see a failed network request in the browser console.
   */
  async getTree(path: string): Promise<GitHubFile[]> {
    try {
      const { data } = await this.octokit.rest.repos.getContent({
        owner: this.config.owner,
        repo: this.config.repo,
        path,
        ref: this.config.branch,
      })

      if (!Array.isArray(data)) {
        return []
      }

      return data.map((item) => ({
        name: item.name,
        path: item.path,
        sha: item.sha,
        size: item.size ?? 0,
        type: item.type as GitHubFile['type'],
        download_url: item.download_url ?? null,
      }))
    } catch (error) {
      const status = (error as { status?: number }).status
      if (status === 404) {
        return []
      }
      throw error
    }
  }

  /**
   * Upload a binary file (e.g. favicon) from an ArrayBuffer.
   */
  async uploadBinaryFile(
    buffer: ArrayBuffer,
    path: string,
    message?: string,
  ): Promise<{ sha: string; path: string }> {
    const base64 = Buffer.from(buffer).toString('base64')
    const commitMessage = message ?? `feat: upload ${path}`

    // Use getTree on parent dir to find existing SHA — avoids a visible 404 console error
    // that would appear if we used getFile() directly on a non-existent path.
    const dir = path.split('/').slice(0, -1).join('/')
    const filename = path.split('/').pop()!
    const siblings = await this.getTree(dir) // returns [] on 404, no console error
    const existingSha = siblings.find((f) => f.name === filename)?.sha

    const { data } = await this.octokit.rest.repos.createOrUpdateFileContents({
      owner: this.config.owner,
      repo: this.config.repo,
      path,
      message: commitMessage,
      content: base64,
      ...(existingSha && { sha: existingSha }),
      branch: this.config.branch,
    })

    return {
      sha: data.content?.sha ?? '',
      path: data.content?.path ?? path,
    }
  }

  /**
   * Create a new file.
   */
  async createFile(
    path: string,
    content: string,
    message?: string,
  ): Promise<{ sha: string; path: string }> {
    const encodedContent = Buffer.from(content, 'utf-8').toString('base64')
    const commitMessage = message ?? `feat: create ${path}`

    const { data } = await this.octokit.rest.repos.createOrUpdateFileContents({
      owner: this.config.owner,
      repo: this.config.repo,
      path,
      message: commitMessage,
      content: encodedContent,
      branch: this.config.branch,
    })

    return {
      sha: data.content?.sha ?? '',
      path: data.content?.path ?? path,
    }
  }

  /**
   * Update an existing file. Requires the current file SHA.
   */
  async updateFile(
    path: string,
    content: string,
    sha: string,
    message?: string,
  ): Promise<{ sha: string; path: string }> {
    const encodedContent = Buffer.from(content, 'utf-8').toString('base64')
    const commitMessage = message ?? `chore: update ${path}`

    const { data } = await this.octokit.rest.repos.createOrUpdateFileContents({
      owner: this.config.owner,
      repo: this.config.repo,
      path,
      message: commitMessage,
      content: encodedContent,
      sha,
      branch: this.config.branch,
    })

    return {
      sha: data.content?.sha ?? '',
      path: data.content?.path ?? path,
    }
  }

  /**
   * Delete a file. Requires the current file SHA.
   */
  async deleteFile(path: string, sha: string, message?: string): Promise<void> {
    const commitMessage = message ?? `chore: delete ${path}`

    await this.octokit.rest.repos.deleteFile({
      owner: this.config.owner,
      repo: this.config.repo,
      path,
      message: commitMessage,
      sha,
      branch: this.config.branch,
    })
  }

  /**
   * Move a file by creating a copy at the new path and deleting the old one.
   * Used to transition posts from drafts to published.
   */
  async moveFile(
    oldPath: string,
    newPath: string,
    oldSha: string,
    message?: string,
  ): Promise<{ sha: string; path: string }> {
    const { content } = await this.getFile(oldPath)
    const result = await this.createFile(
      newPath,
      content,
      message ?? `chore: move ${oldPath} → ${newPath}`,
    )
    await this.deleteFile(oldPath, oldSha, message ?? `chore: move ${oldPath} → ${newPath}`)
    return result
  }

  /**
   * Get a file's SHA without fetching its content (efficient for updates).
   */
  async getFileSha(path: string): Promise<string> {
    const { sha } = await this.getFile(path)
    return sha
  }

  // ─── Repository ───────────────────────────────────────────────────────────

  async getRepo(): Promise<{ name: string; description: string | null; html_url: string }> {
    const { data } = await this.octokit.rest.repos.get({
      owner: this.config.owner,
      repo: this.config.repo,
    })

    return {
      name: data.name,
      description: data.description,
      html_url: data.html_url,
    }
  }

  async getConfig(): Promise<GitHubConfig> {
    return { ...this.config }
  }
}

// ─── Singleton Factory ────────────────────────────────────────────────────────

let _client: GitHubClient | null = null

export function createGitHubClient(config: GitHubConfig): GitHubClient {
  _client = new GitHubClient(config)
  return _client
}

export function getGitHubClient(): GitHubClient {
  if (!_client) {
    throw new Error('GitHubClient not initialized. Call createGitHubClient() first.')
  }
  return _client
}

export function resetGitHubClient(): void {
  _client = null
}
