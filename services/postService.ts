import type { Post, PostInput, PostListItem, PostStatus } from '@/types'
import { HEXO_PATHS } from '@/config/constants'
import {
  parseFrontmatter,
  buildPostContent,
  generateFilename,
  slugFromFilename,
  extractDate,
} from '@/lib/frontmatter'
import { GitHubClient } from './githubClient'

export class PostService {
  constructor(private client: GitHubClient) {}

  // ─── List ──────────────────────────────────────────────────────────────────

  async getPosts(status: PostStatus = 'all'): Promise<PostListItem[]> {
    const results: PostListItem[] = []

    if (status === 'all' || status === 'published') {
      try {
        const files = await this.client.getTree(HEXO_PATHS.POSTS)
        const mdFiles = files.filter((f) => f.name.endsWith('.md') && f.type === 'file')
        const posts = await Promise.all(mdFiles.map((f) => this.fileToListItem(f.path, f.sha, false)))
        results.push(...posts)
      } catch {
        // Directory may be empty
      }
    }

    if (status === 'all' || status === 'draft') {
      try {
        const files = await this.client.getTree(HEXO_PATHS.DRAFTS)
        const mdFiles = files.filter((f) => f.name.endsWith('.md') && f.type === 'file')
        const drafts = await Promise.all(mdFiles.map((f) => this.fileToListItem(f.path, f.sha, true)))
        results.push(...drafts)
      } catch {
        // Directory may be empty
      }
    }

    return results.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }

  // ─── Get Single ───────────────────────────────────────────────────────────

  async getPost(path: string): Promise<Post> {
    const { content: raw, sha } = await this.client.getFile(path)
    return this.rawToPost(raw, sha, path)
  }

  // ─── Create ───────────────────────────────────────────────────────────────

  async createPost(input: PostInput): Promise<Post> {
    const isDraft = input.draft ?? false
    const now = new Date()
    const filename = generateFilename(input.title, now)
    const dir = isDraft ? HEXO_PATHS.DRAFTS : HEXO_PATHS.POSTS
    const path = `${dir}/${filename}`

    const content = buildPostContent(input, now)

    const { sha } = await this.client.createFile(
      path,
      content,
      `feat: create post "${input.title}"`,
    )

    return this.rawToPost(content, sha, path)
  }

  // ─── Update ───────────────────────────────────────────────────────────────

  async updatePost(path: string, input: PostInput, sha: string): Promise<Post> {
    const { content: existing } = await this.client.getFile(path)
    const { frontmatter: existingFm, body: existingBody } = parseFrontmatter(existing)

    const currentIsDraft = path.startsWith(HEXO_PATHS.DRAFTS)
    const newIsDraft = input.draft ?? currentIsDraft

    const updatedContent = buildPostContent(
      {
        title: input.title,
        body: input.body ?? existingBody,
        tags: input.tags ?? (existingFm.tags as string[]) ?? [],
        categories: input.categories ?? (existingFm.categories as string[]) ?? [],
        draft: newIsDraft,
        description: input.description !== undefined ? input.description : existingFm.description as string | undefined,
        cover: input.cover !== undefined ? input.cover : existingFm.cover as string | undefined,
        slug: input.slug !== undefined ? input.slug : existingFm.slug as string | undefined,
      },
      existingFm.date ? new Date(existingFm.date as string) : undefined,
    )

    // If draft status changed, move the file to the appropriate directory
    if (currentIsDraft !== newIsDraft) {
      const filename = path.split('/').pop()!
      const newDir = newIsDraft ? HEXO_PATHS.DRAFTS : HEXO_PATHS.POSTS
      const newPath = `${newDir}/${filename}`
      const action = newIsDraft ? 'unpublish' : 'publish'

      const { sha: newSha } = await this.client.createFile(
        newPath,
        updatedContent,
        `${action === 'publish' ? 'feat' : 'chore'}: ${action} "${input.title}"`,
      )
      await this.client.deleteFile(path, sha, `chore: move "${input.title}" to ${newDir}`)
      return this.rawToPost(updatedContent, newSha, newPath)
    }

    const result = await this.client.updateFile(
      path,
      updatedContent,
      sha,
      `chore: update post "${input.title}"`,
    )

    return this.rawToPost(updatedContent, result.sha, path)
  }

  // ─── Delete ───────────────────────────────────────────────────────────────

  async deletePost(path: string, sha: string): Promise<void> {
    await this.client.deleteFile(path, sha, `chore: delete post at ${path}`)
  }

  // ─── Publish Draft ────────────────────────────────────────────────────────

  /**
   * Move a draft from source/_drafts/ to source/_posts/
   * and remove the `draft: true` frontmatter flag.
   */
  async publishDraft(draftPath: string, sha: string): Promise<Post> {
    const { content: raw } = await this.client.getFile(draftPath)
    const { frontmatter, body } = parseFrontmatter(raw)

    frontmatter.draft = false

    const filename = draftPath.split('/').pop()!
    const newPath = `${HEXO_PATHS.POSTS}/${filename}`

    const updatedContent = buildPostContent(
      {
        title: frontmatter.title,
        body,
        tags: frontmatter.tags,
        categories: frontmatter.categories,
        draft: false,
        description: frontmatter.description as string | undefined,
        cover: frontmatter.cover as string | undefined,
      },
      frontmatter.date ? new Date(frontmatter.date) : undefined,
    )

    const result = await this.client.moveFile(
      draftPath,
      newPath,
      sha,
      `feat: publish draft "${frontmatter.title}"`,
    )

    return this.rawToPost(updatedContent, result.sha, newPath)
  }

  /**
   * Move a published post back to drafts.
   */
  async unpublishPost(postPath: string, sha: string): Promise<Post> {
    const { content: raw } = await this.client.getFile(postPath)
    const { frontmatter, body } = parseFrontmatter(raw)

    frontmatter.draft = true

    const filename = postPath.split('/').pop()!
    const newPath = `${HEXO_PATHS.DRAFTS}/${filename}`

    const updatedContent = buildPostContent(
      {
        title: frontmatter.title,
        body,
        tags: frontmatter.tags,
        categories: frontmatter.categories,
        draft: true,
        description: frontmatter.description as string | undefined,
        cover: frontmatter.cover as string | undefined,
      },
      frontmatter.date ? new Date(frontmatter.date) : undefined,
    )

    const result = await this.client.moveFile(
      postPath,
      newPath,
      sha,
      `chore: unpublish post "${frontmatter.title}"`,
    )

    return this.rawToPost(updatedContent, result.sha, newPath)
  }

  // ─── Private Helpers ─────────────────────────────────────────────────────

  private rawToPost(raw: string, sha: string, path: string): Post {
    const { frontmatter, body } = parseFrontmatter(raw)
    const filename = path.split('/').pop()!
    const isDraft = path.startsWith(HEXO_PATHS.DRAFTS)
    const slug = frontmatter.slug ?? slugFromFilename(filename)
    const createdAt = extractDate(frontmatter, filename)

    return {
      path,
      sha,
      filename,
      slug,
      frontmatter,
      body,
      raw,
      isDraft,
      createdAt,
      updatedAt: frontmatter.updated as string | undefined,
    }
  }

  private async fileToListItem(path: string, sha: string, isDraft: boolean): Promise<PostListItem> {
    const { content: raw } = await this.client.getFile(path)
    const { frontmatter } = parseFrontmatter(raw)
    const filename = path.split('/').pop()!
    const slug = frontmatter.slug ?? slugFromFilename(filename)
    const date = extractDate(frontmatter, filename)

    return {
      path,
      sha,
      filename,
      slug,
      title: frontmatter.title ?? slug,
      date,
      tags: (frontmatter.tags ?? []) as string[],
      categories: (frontmatter.categories ?? []) as string[],
      isDraft,
      description: frontmatter.description as string | undefined,
    }
  }
}

// ─── Factory ──────────────────────────────────────────────────────────────────

let _postService: PostService | null = null

export function createPostService(client: GitHubClient): PostService {
  _postService = new PostService(client)
  return _postService
}

export function getPostService(): PostService {
  if (!_postService) {
    throw new Error('PostService not initialized. Call createPostService() first.')
  }
  return _postService
}
