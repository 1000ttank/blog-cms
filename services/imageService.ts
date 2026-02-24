import type { ImageUploadResult, ImageProvider } from '@/types'
import { getGitHubClient } from './githubClient'

/**
 * Upload an image to the configured provider.
 * Currently supports GitHub as a CDN via jsDelivr.
 * Future: SMMS, S3, Cloudflare R2.
 */
export async function uploadImage(
  file: File,
  provider: ImageProvider = 'github',
): Promise<ImageUploadResult> {
  switch (provider) {
    case 'github':
      return uploadToGitHub(file)
    default:
      throw new Error(`Image provider "${provider}" is not yet supported`)
  }
}

async function uploadToGitHub(file: File): Promise<ImageUploadResult> {
  const client = getGitHubClient()
  const config = await client.getConfig()

  const timestamp = Date.now()
  const safeFilename = file.name.replace(/[^a-zA-Z0-9.-]/g, '-')
  const path = `source/assets/${timestamp}-${safeFilename}`

  const buffer = await file.arrayBuffer()

  // Direct API call with pre-encoded content
  const octokit = (client as unknown as { octokit: { rest: unknown } }).octokit
  void octokit // suppress unused warning – client exposes internal via createFile

  const result = await client.createFile(
    path,
    // Gray-matter stringify expects string, but for binary we use raw base64 approach
    // For images we need to handle differently — use a direct approach
    new TextDecoder('latin1').decode(new Uint8Array(buffer)),
    `feat: upload image ${safeFilename}`,
  )

  const jsdelivrUrl = `https://cdn.jsdelivr.net/gh/${config.owner}/${config.repo}@${config.branch}/${result.path}`

  return {
    url: jsdelivrUrl,
    filename: safeFilename,
    provider: 'github',
  }
}

export function buildMarkdownImage(alt: string, url: string): string {
  return `![${alt}](${url})`
}
