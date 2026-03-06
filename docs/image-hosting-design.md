# 图床功能架构设计

## 概述

为 Hexo-NX-CMS 设计一个灵活的图床系统，支持多种图床服务，并与 Monaco Editor 深度集成。

## 核心需求

1. **拖拽上传**：支持拖拽图片到编辑器区域自动上传
2. **粘贴上传**：支持 Ctrl+V 粘贴剪贴板图片
3. **多图床支持**：支持 GitHub、SM.MS、七牛云、阿里云 OSS 等
4. **进度显示**：上传时显示进度条和状态
5. **历史管理**：查看和管理已上传的图片
6. **自动插入**：上传成功后自动插入 Markdown 图片语法

---

## 技术架构

### 1. 图床服务抽象层

创建统一的图床接口，方便扩展：

```typescript
// services/imageHosting/types.ts
export interface ImageHostingConfig {
  type: 'github' | 'smms' | 'qiniu' | 'aliyun' | 'custom'
  enabled: boolean
  config: Record<string, any>
}

export interface UploadResult {
  url: string          // 图片访问 URL
  deleteUrl?: string   // 删除 URL（如果支持）
  filename: string     // 文件名
  size: number         // 文件大小（字节）
  uploadedAt: Date     // 上传时间
}

export interface ImageHostingService {
  name: string
  upload(file: File, onProgress?: (percent: number) => void): Promise<UploadResult>
  delete?(url: string): Promise<void>
  validate(): Promise<boolean>
}
```

### 2. 图床实现方案

#### 方案 A：GitHub 仓库图床（推荐）

**优点：**
- 免费无限容量
- 与现有 GitHub 集成无缝衔接
- 支持 CDN 加速（jsDelivr、Statically）
- 版本控制，可追溯

**缺点：**
- 单文件限制 100MB
- 国内访问速度可能较慢（可用 CDN 解决）

**实现：**
```typescript
// services/imageHosting/githubImageHosting.ts
export class GitHubImageHosting implements ImageHostingService {
  name = 'GitHub'

  constructor(
    private owner: string,
    private repo: string,
    private branch: string = 'main',
    private path: string = 'images', // 图片存储路径
    private useCDN: boolean = true,
    private cdnProvider: 'jsdelivr' | 'statically' = 'jsdelivr'
  ) {}

  async upload(file: File, onProgress?: (percent: number) => void): Promise<UploadResult> {
    // 1. 生成唯一文件名（时间戳 + 随机字符串）
    const filename = this.generateFilename(file.name)
    const filePath = `${this.path}/${filename}`

    // 2. 转换为 Base64
    const base64 = await this.fileToBase64(file)

    // 3. 上传到 GitHub
    const octokit = getGitHubClient()
    await octokit.repos.createOrUpdateFileContents({
      owner: this.owner,
      repo: this.repo,
      path: filePath,
      message: `Upload image: ${filename}`,
      content: base64,
      branch: this.branch,
    })

    // 4. 生成 CDN URL
    const url = this.useCDN
      ? this.getCDNUrl(filePath)
      : `https://raw.githubusercontent.com/${this.owner}/${this.repo}/${this.branch}/${filePath}`

    return {
      url,
      filename,
      size: file.size,
      uploadedAt: new Date(),
    }
  }

  private getCDNUrl(path: string): string {
    if (this.cdnProvider === 'jsdelivr') {
      return `https://cdn.jsdelivr.net/gh/${this.owner}/${this.repo}@${this.branch}/${path}`
    } else {
      return `https://cdn.statically.io/gh/${this.owner}/${this.repo}/${this.branch}/${path}`
    }
  }

  private generateFilename(originalName: string): string {
    const ext = originalName.split('.').pop()
    const timestamp = Date.now()
    const random = Math.random().toString(36).substring(2, 8)
    return `${timestamp}-${random}.${ext}`
  }
}
```

#### 方案 B：SM.MS 免费图床

**优点：**
- 完全免费
- 无需配置
- 国内访问速度快
- 支持游客上传

**缺点：**
- 单图 5MB 限制
- 无法删除已上传图片
- 依赖第三方服务稳定性

**实现：**
```typescript
// services/imageHosting/smmsImageHosting.ts
export class SMImageHosting implements ImageHostingService {
  name = 'SM.MS'
  private apiUrl = 'https://sm.ms/api/v2'

  constructor(private token?: string) {}

  async upload(file: File, onProgress?: (percent: number) => void): Promise<UploadResult> {
    const formData = new FormData()
    formData.append('smfile', file)

    const headers: Record<string, string> = {}
    if (this.token) {
      headers['Authorization'] = this.token
    }

    const response = await fetch(`${this.apiUrl}/upload`, {
      method: 'POST',
      headers,
      body: formData,
    })

    const data = await response.json()

    if (!data.success) {
      throw new Error(data.message || '上传失败')
    }

    return {
      url: data.data.url,
      deleteUrl: data.data.delete,
      filename: data.data.filename,
      size: data.data.size,
      uploadedAt: new Date(),
    }
  }
}
```

#### 方案 C：七牛云 / 阿里云 OSS（企业级）

**优点：**
- 专业 CDN 加速
- 高可用性
- 图片处理功能（缩略图、水印等）
- 精细的权限控制

**缺点：**
- 需要付费（有免费额度）
- 配置复杂
- 需要额外的 AccessKey

**实现：**
```typescript
// services/imageHosting/qiniuImageHosting.ts
export class QiniuImageHosting implements ImageHostingService {
  name = '七牛云'

  constructor(
    private accessKey: string,
    private secretKey: string,
    private bucket: string,
    private domain: string
  ) {}

  async upload(file: File, onProgress?: (percent: number) => void): Promise<UploadResult> {
    // 1. 获取上传 Token
    const token = this.generateUploadToken()

    // 2. 上传文件
    const formData = new FormData()
    formData.append('file', file)
    formData.append('token', token)
    formData.append('key', this.generateFilename(file.name))

    const response = await fetch('https://upload.qiniup.com', {
      method: 'POST',
      body: formData,
    })

    const data = await response.json()

    return {
      url: `${this.domain}/${data.key}`,
      filename: data.key,
      size: file.size,
      uploadedAt: new Date(),
    }
  }
}
```

### 3. 图床管理器

统一管理所有图床服务：

```typescript
// services/imageHosting/imageHostingManager.ts
export class ImageHostingManager {
  private services: Map<string, ImageHostingService> = new Map()
  private activeService: string = 'github'

  registerService(id: string, service: ImageHostingService) {
    this.services.set(id, service)
  }

  setActiveService(id: string) {
    if (!this.services.has(id)) {
      throw new Error(`图床服务 ${id} 不存在`)
    }
    this.activeService = id
  }

  async upload(file: File, onProgress?: (percent: number) => void): Promise<UploadResult> {
    const service = this.services.get(this.activeService)
    if (!service) {
      throw new Error('未配置图床服务')
    }

    // 验证文件类型
    if (!this.isValidImageFile(file)) {
      throw new Error('不支持的文件类型')
    }

    // 验证文件大小（10MB）
    if (file.size > 10 * 1024 * 1024) {
      throw new Error('文件大小不能超过 10MB')
    }

    return service.upload(file, onProgress)
  }

  private isValidImageFile(file: File): boolean {
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']
    return validTypes.includes(file.type)
  }
}
```

### 4. Zustand Store

```typescript
// store/imageStore.ts
interface ImageStore {
  uploadHistory: UploadResult[]
  isUploading: boolean
  uploadProgress: number

  uploadImage(file: File): Promise<UploadResult>
  getHistory(): UploadResult[]
  clearHistory(): void
}

export const useImageStore = create<ImageStore>((set, get) => ({
  uploadHistory: [],
  isUploading: false,
  uploadProgress: 0,

  async uploadImage(file: File) {
    set({ isUploading: true, uploadProgress: 0 })

    try {
      const manager = getImageHostingManager()
      const result = await manager.upload(file, (percent) => {
        set({ uploadProgress: percent })
      })

      set((state) => ({
        uploadHistory: [result, ...state.uploadHistory],
        isUploading: false,
        uploadProgress: 100,
      }))

      // 保存到 localStorage
      localStorage.setItem('image_upload_history', JSON.stringify(get().uploadHistory))

      return result
    } catch (error) {
      set({ isUploading: false, uploadProgress: 0 })
      throw error
    }
  },

  getHistory() {
    const saved = localStorage.getItem('image_upload_history')
    if (saved) {
      return JSON.parse(saved)
    }
    return []
  },

  clearHistory() {
    set({ uploadHistory: [] })
    localStorage.removeItem('image_upload_history')
  },
}))
```

---

## Monaco Editor 集成

### 1. 拖拽上传

```typescript
// components/editor/MonacoEditor.tsx
editor.onDidPaste((e) => {
  const items = e.clipboardData?.items
  if (!items) return

  for (const item of items) {
    if (item.type.startsWith('image/')) {
      const file = item.getAsFile()
      if (file) {
        handleImageUpload(file)
      }
    }
  }
})

editor.onDrop((e) => {
  const files = e.dataTransfer?.files
  if (!files) return

  for (const file of files) {
    if (file.type.startsWith('image/')) {
      handleImageUpload(file)
    }
  }
})

async function handleImageUpload(file: File) {
  const { uploadImage } = useImageStore.getState()

  // 插入占位符
  const placeholder = `![上传中...](uploading-${Date.now()})`
  editor.executeEdits('', [{
    range: editor.getSelection(),
    text: placeholder,
  }])

  try {
    const result = await uploadImage(file)

    // 替换占位符为真实 URL
    const model = editor.getModel()
    const content = model.getValue()
    const newContent = content.replace(placeholder, `![${file.name}](${result.url})`)
    model.setValue(newContent)

    toast.success('图片上传成功！')
  } catch (error) {
    toast.error('图片上传失败：' + error.message)

    // 删除占位符
    const model = editor.getModel()
    const content = model.getValue()
    const newContent = content.replace(placeholder, '')
    model.setValue(newContent)
  }
}
```

### 2. 工具栏按钮

```typescript
// 添加图片上传按钮
<Button
  variant="ghost"
  size="sm"
  onClick={() => fileInputRef.current?.click()}
  disabled={isUploading}
>
  {isUploading ? (
    <>
      <Loader2 className="h-4 w-4 animate-spin" />
      上传中 {uploadProgress}%
    </>
  ) : (
    <>
      <ImagePlus className="h-4 w-4" />
      插入图片
    </>
  )}
</Button>

<input
  ref={fileInputRef}
  type="file"
  accept="image/*"
  multiple
  className="hidden"
  onChange={handleFileSelect}
/>
```

---

## 配置界面

在 Settings 页面添加图床配置：

```typescript
// app/settings/page.tsx
<Card>
  <CardHeader>
    <CardTitle>图床配置</CardTitle>
    <CardDescription>选择图片上传服务</CardDescription>
  </CardHeader>
  <CardContent className="space-y-4">
    <Select value={imageHostingType} onValueChange={setImageHostingType}>
      <SelectTrigger>
        <SelectValue placeholder="选择图床服务" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="github">GitHub 仓库（推荐）</SelectItem>
        <SelectItem value="smms">SM.MS 免费图床</SelectItem>
        <SelectItem value="qiniu">七牛云</SelectItem>
        <SelectItem value="aliyun">阿里云 OSS</SelectItem>
      </SelectContent>
    </Select>

    {imageHostingType === 'github' && (
      <div className="space-y-3">
        <Input
          label="图片存储路径"
          value={githubImagePath}
          onChange={(e) => setGithubImagePath(e.target.value)}
          placeholder="images"
        />
        <Switch
          label="启用 CDN 加速"
          checked={useCDN}
          onCheckedChange={setUseCDN}
        />
        {useCDN && (
          <Select value={cdnProvider} onValueChange={setCdnProvider}>
            <SelectItem value="jsdelivr">jsDelivr</SelectItem>
            <SelectItem value="statically">Statically</SelectItem>
          </Select>
        )}
      </div>
    )}

    {imageHostingType === 'smms' && (
      <Input
        label="API Token（可选）"
        value={smmsToken}
        onChange={(e) => setSmmsToken(e.target.value)}
        placeholder="留空使用游客模式"
      />
    )}
  </CardContent>
</Card>
```

---

## 推荐方案

**初期（MVP）：**
1. 使用 **GitHub 仓库图床** 作为默认方案
2. 图片存储在 `source/images/` 目录
3. 使用 jsDelivr CDN 加速

**优势：**
- 零成本
- 与现有架构完美集成
- 图片与博客内容在同一仓库，便于管理
- 支持版本控制

**后期扩展：**
- 添加 SM.MS 作为备选方案
- 支持自定义图床（通过配置 API 端点）
- 添加图片管理界面（查看、删除、批量操作）

---

## 实现优先级

1. **P0（核心功能）**
   - Monaco Editor 集成
   - GitHub 图床基础上传
   - 拖拽/粘贴上传
   - 自动插入 Markdown 语法

2. **P1（增强体验）**
   - 上传进度显示
   - 错误处理和重试
   - 图片压缩（可选）
   - 上传历史记录

3. **P2（高级功能）**
   - 多图床支持
   - 图片管理界面
   - 批量上传
   - 图片裁剪/编辑

---

## 文件结构

```
blog-cms/
├── services/
│   └── imageHosting/
│       ├── types.ts                    # 类型定义
│       ├── imageHostingManager.ts      # 图床管理器
│       ├── githubImageHosting.ts       # GitHub 实现
│       ├── smmsImageHosting.ts         # SM.MS 实现
│       └── qiniuImageHosting.ts        # 七牛云实现
├── store/
│   └── imageStore.ts                   # 图片上传状态管理
├── components/
│   └── editor/
│       ├── MonacoEditor.tsx            # Monaco 编辑器
│       ├── ImageUploadButton.tsx       # 上传按钮
│       └── ImageHistoryDialog.tsx      # 历史记录弹窗
└── app/
    └── settings/
        └── ImageHostingSettings.tsx    # 图床配置界面
```

---

## 总结

这个设计方案具有以下特点：

1. **灵活扩展**：抽象接口设计，易于添加新的图床服务
2. **用户友好**：拖拽、粘贴、工具栏多种上传方式
3. **零成本启动**：默认使用 GitHub，无需额外费用
4. **渐进增强**：可根据需求逐步添加高级功能

建议先实现 GitHub 图床 + Monaco Editor 集成，验证可行性后再扩展其他功能。
