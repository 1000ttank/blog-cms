import matter from 'gray-matter'
import slugify from 'slugify'
import { format } from 'date-fns'
import type { PostFrontmatter, PostInput } from '@/types'

export function parseFrontmatter(raw: string): {
  frontmatter: PostFrontmatter
  body: string
} {
  const { data, content } = matter(raw)
  return {
    frontmatter: data as PostFrontmatter,
    body: content,
  }
}

export function stringifyFrontmatter(frontmatter: PostFrontmatter, body: string): string {
  return matter.stringify(body, frontmatter as Record<string, unknown>)
}

export function generateSlug(title: string): string {
  return slugify(title, {
    lower: true,
    strict: true,
    locale: 'en',
    trim: true,
  })
}

export function generateFilename(title: string, date?: Date): string {
  const slug = generateSlug(title)
  const datePrefix = format(date ?? new Date(), 'yyyy-MM-dd')
  return `${datePrefix}-${slug}.md`
}

export function buildFrontmatter(input: PostInput, date?: Date): PostFrontmatter {
  const now = date ?? new Date()
  return {
    title: input.title,
    date: format(now, "yyyy-MM-dd'T'HH:mm:ssxxx"),
    tags: input.tags ?? [],
    categories: input.categories ?? [],
    draft: input.draft ?? false,
    ...(input.description && { description: input.description }),
    ...(input.cover && { cover: input.cover }),
    ...(input.slug && { slug: input.slug }),
  }
}

export function buildPostContent(input: PostInput, date?: Date): string {
  const frontmatter = buildFrontmatter(input, date)
  return stringifyFrontmatter(frontmatter, input.body)
}

/**
 * Extract slug from a filename like 2026-01-01-hello-world.md
 * Returns 'hello-world'
 */
export function slugFromFilename(filename: string): string {
  const withoutExtension = filename.replace(/\.md$/, '')
  // Strip optional date prefix YYYY-MM-DD-
  const withoutDate = withoutExtension.replace(/^\d{4}-\d{2}-\d{2}-/, '')
  return withoutDate
}

/**
 * Build a safe GitHub file path for a post
 */
export function buildPostPath(title: string, isDraft: boolean, date?: Date): string {
  const filename = generateFilename(title, date)
  const dir = isDraft ? 'source/_drafts' : 'source/_posts'
  return `${dir}/${filename}`
}

/**
 * Extract date from frontmatter or filename
 */
export function extractDate(frontmatter: PostFrontmatter, filename: string): string {
  if (frontmatter.date) {
    return typeof frontmatter.date === 'string'
      ? frontmatter.date
      : format(new Date(frontmatter.date as string), "yyyy-MM-dd'T'HH:mm:ssxxx")
  }

  const dateMatch = filename.match(/^(\d{4}-\d{2}-\d{2})/)
  if (dateMatch) {
    return `${dateMatch[1]}T00:00:00+00:00`
  }

  return format(new Date(), "yyyy-MM-dd'T'HH:mm:ssxxx")
}
