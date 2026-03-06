/**
 * GitHub 图床上传服务
 */

import { Octokit } from '@octokit/rest'
import type { ImageHostingConfig, UploadResult } from '@/types/imageHosting'

export class GitHubImageHosting {
  private octokit: Octokit
  private config: ImageHostingConfig

  constructor(token: string, config: ImageHostingConfig) {
    this.octokit = new Octokit({ auth: token })
    this.config = config
  }

  /**
   * 上传图片到 GitHub
   */
  async upload(
    file: File,
    onProgress?: (percent: number) => void
  ): Promise<UploadResult> {
    // 1. 验证文件
    this.validateFile(file)

    // 2. 生成文件名和路径
    const filename = this.generateFilename(file.name)
    const yearMonth = this.config.useYearMonthFolder ? this.getYearMonth() : ''
    const filePath = this.buildFilePath(filename, yearMonth)

    // 3. 转换为 Base64
    onProgress?.(10)
    const base64 = await this.fileToBase64(file)

    // 4. 上传到 GitHub
    onProgress?.(50)
    try {
      await this.octokit.repos.createOrUpdateFileContents({
        owner: this.config.repoOwner,
        repo: this.config.repoName,
        path: filePath,
        message: `Upload image: ${filename}`,
        content: base64,
        branch: this.config.branch,
      })
    } catch (error: any) {
      throw new Error(`上传失败: ${error.message}`)
    }

    onProgress?.(100)

    return {
      url: '', // URL 将由 URL 生成器生成
      filename,
      size: file.size,
      uploadedAt: new Date(),
      path: filePath,
    }
  }

  /**
   * 验证文件
   */
  private validateFile(file: File): void {
    // 检查文件类型
    if (!this.config.allowedTypes.includes(file.type)) {
      throw new Error(`不支持的文件类型: ${file.type}`)
    }

    // 检查文件大小
    const maxSizeBytes = this.config.maxSize * 1024 * 1024
    if (file.size > maxSizeBytes) {
      throw new Error(`文件大小不能超过 ${this.config.maxSize}MB`)
    }
  }

  /**
   * 生成文件名
   */
  private generateFilename(originalName: string): string {
    const ext = originalName.split('.').pop() || 'png'

    switch (this.config.namingPattern) {
      case 'timestamp':
        const timestamp = Date.now()
        const random = Math.random().toString(36).substring(2, 8)
        return `${timestamp}-${random}.${ext}`

      case 'hash':
        const hash = this.simpleHash(originalName + Date.now())
        return `${hash}.${ext}`

      case 'original':
        // 移除特殊字符，保留原文件名
        const safeName = originalName
          .replace(/\.[^/.]+$/, '') // 移除扩展名
          .replace(/[^a-zA-Z0-9\u4e00-\u9fa5-]/g, '-') // 替换特殊字符
          .toLowerCase()
        return `${safeName}-${Date.now()}.${ext}`

      default:
        return `${Date.now()}.${ext}`
    }
  }

  /**
   * 简单哈希函数
   */
  private simpleHash(str: string): string {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = (hash << 5) - hash + char
      hash = hash & hash
    }
    return Math.abs(hash).toString(36)
  }

  /**
   * 获取年月字符串
   */
  private getYearMonth(): string {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    return `${year}/${month}`
  }

  /**
   * 构建文件路径
   */
  private buildFilePath(filename: string, yearMonth: string): string {
    const parts = [this.config.imagePath]
    if (yearMonth) {
      parts.push(yearMonth)
    }
    parts.push(filename)
    return parts.join('/')
  }

  /**
   * 文件转 Base64
   */
  private fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        const base64 = (reader.result as string).split(',')[1]
        resolve(base64)
      }
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }
}
