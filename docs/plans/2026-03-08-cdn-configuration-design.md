# CDN 配置系统设计文档

**日期：** 2026-03-08
**状态：** 已批准
**作者：** Claude (Kiro)

## 概述

本设计文档描述了 Hexo-NX-CMS 的 CDN 配置系统，包括图床 CDN 配置和 Blog/CMS 自定义域名配置。系统分为两个独立部分：CMS 内的图床 CDN 配置界面，以及通过文档指导的 Blog/CMS 域名配置。

## 目标

1. 为图床添加"CMS 自供"CDN 选项，通过 Cloudflare 智能路由提供国内可用的 CDN 服务
2. 提供完整的 Blog/CMS 自定义域名配置文档，支持三种场景（顶级域名、二级域名、子路径）
3. 区分博客作者和 CMS 管理员的权限和配置能力

## 整体架构

### 系统组成

**1. 图床 CDN 配置**（在 CMS 中配置）
- **位置：** `/image-hosting` 页面
- **用户：** CMS 管理员
- **配置内容：** 图片存储仓库的 CDN 访问方式
- **选项：**
  - jsDelivr（全球 CDN，国内不稳定）
  - Statically（全球 CDN，国内不稳定）
  - CMS 自供（通过 Cloudflare DNS 到 jsDelivr/Statically，国内可用）

**2. Blog/CMS CDN 配置**（通过文档指导）
- **位置：** 文档教程
- **用户：** 博客作者（所有用户）
- **配置内容：** Blog 和 CMS 站点的自定义域名
- **场景：**
  - 顶级域名（example.com）
  - 二级域名（blog.example.com）
  - 子路径（example.com/blog）

### 权限模型

```
博客作者（普通用户）
├── 可以配置：Blog/CMS 自定义域名（通过文档自助）
└── 不能配置：图床 CDN

CMS 管理员
├── 可以配置：图床 CDN（包括 CMS 自供）
└── 可以配置：Blog/CMS 自定义域名（同博客作者）
```

## 图床 CDN 配置（CMS 自供）

### UI 设计

在 `/image-hosting` 页面的 CDN 配置部分，采用三步选择流程：

**第一步：选择 CDN 类型**
```
○ jsDelivr（全球 CDN，国内不稳定）
○ Statically（全球 CDN，国内不稳定）
○ CMS 自供（通过 Cloudflare DNS 到 jsDelivr/Statically，国内可用）
```

**第二步：如果选择"CMS 自供"，显示后端选择**
```
选择后端 CDN：
○ CMS 自供 to jsDelivr
○ CMS 自供 to Statically
```

**第三步：显示可用域名列表**
```
选择域名：
[下拉框]
  cdn1.example.com（全球）
  cdn2.example.com（亚太优化）
  ...
```

### 数据结构

**配置文件：`config/cmsCdnDomains.ts`**

```typescript
export interface CmsCdnDomain {
  domain: string
  region: string
  description: string
}

export const CMS_CDN_DOMAINS: Record<'jsdelivr' | 'statically', CmsCdnDomain[]> = {
  jsdelivr: [
    {
      domain: 'cdn1.example.com',
      region: '全球',
      description: '通过 Cloudflare 智能路由到 jsDelivr'
    },
    {
      domain: 'cdn2.example.com',
      region: '亚太优化',
      description: '亚太地区优先，其他地区回退到 jsDelivr'
    },
  ],
  statically: [
    {
      domain: 'cdn3.example.com',
      region: '全球',
      description: '通过 Cloudflare 智能路由到 Statically'
    },
  ],
}
```

**存储格式：`localStorage` 中的 `image_hosting_config`**

```typescript
{
  cdnRoute: 'cms-provided',
  cmsProvidedConfig: {
    backend: 'jsdelivr', // 或 'statically'
    domain: 'cdn1.example.com'
  }
}
```

### URL 生成逻辑

当用户选择 CMS 自供时，图片 URL 格式：
```
https://cdn1.example.com/gh/{owner}/{repo}@{branch}/{path}
```

示例：
```
https://cdn1.example.com/gh/username/blog-images@main/uploads/2026/03/image.png
```

### 域名管理方式

采用**硬编码方式**管理 CMS 自供域名列表：

**优点：**
- 域名变更频率低，适合硬编码
- 版本控制，变更可追溯
- TypeScript 类型安全
- 部署简单，无需额外配置管理

**添加新域名流程：**
1. 编辑 `config/cmsCdnDomains.ts`
2. 添加域名配置到对应的后端数组
3. 提交代码并部署

## 文档结构

### 文档组织

**1. 简化版（融入快速开始）**

**位置：** `docs/getting-started.md`

在现有的快速开始文档中添加新章节：

```markdown
## 5. 配置自定义域名（可选）

### Blog 自定义域名
如果你想使用自己的域名访问博客（如 blog.example.com），请参考：
- 二级域名配置：[完整教程](./blog-cms-custom-domain.md#二级域名)
- 顶级域名配置：[完整教程](./blog-cms-custom-domain.md#顶级域名)
- 子路径配置：[完整教程](./blog-cms-custom-domain.md#子路径)

### CMS 自定义域名
如果你想使用自己的域名访问 CMS（如 cms.example.com），配置方式与 Blog 相同。
```

**2. 完整版文档**

创建两个独立文档：

#### A. `docs/blog-cms-custom-domain.md`（博客作者用）

**目标读者：** 所有用户
**内容大纲：**

```markdown
# Blog/CMS 自定义域名配置指南

## 前置要求
- 拥有一个域名
- 域名托管在 Cloudflare（推荐）或其他 DNS 提供商

## 场景 1：二级域名（推荐）
### 为什么推荐二级域名
### 配置步骤
1. Cloudflare DNS 配置
   - 添加 CNAME 记录
   - 代理状态设置
2. GitHub Pages 设置
   - 添加自定义域名
   - 等待 HTTPS 证书生成
3. 验证配置
   - DNS 解析检查
   - HTTPS 访问测试

## 场景 2：顶级域名
### 配置步骤
1. Cloudflare DNS 配置
   - 添加 A 记录（4 个 GitHub Pages IP）
   - 添加 AAAA 记录（IPv6）
2. GitHub Pages 设置
3. 验证配置

## 场景 3：子路径（高级）
### 使用场景
### 配置步骤
1. Cloudflare Workers 配置
   - 创建 Worker
   - 配置路径重写规则
2. 路由配置
3. 验证配置

## 常见问题
- HTTPS 证书问题
- DNS 生效时间
- 404 错误排查
- 子路径访问问题
```

#### B. `docs/cms-cdn-setup-guide.md`（管理员用）

**目标读者：** CMS 管理员
**内容大纲：**

```markdown
# CMS 自供 CDN 配置指南（管理员）

## 概述
### 什么是 CMS 自供 CDN
### 架构说明
- Cloudflare Workers 智能路由
- jsDelivr/Statically 后端
- 地理位置优化

## Cloudflare Workers 部署
### Workers 代码
### 部署步骤
1. 创建 Worker
2. 配置环境变量
3. 添加自定义域名
### 路由配置

## 添加新域名
### 修改配置文件
1. 编辑 `config/cmsCdnDomains.ts`
2. 添加域名信息
3. 提交并部署
### DNS 配置
1. 添加 CNAME 记录
2. 配置 Cloudflare 代理
### 测试验证
1. DNS 解析测试
2. CDN 访问测试
3. 地理位置路由测试

## 监控和维护
### 查看访问日志
### 性能监控
### 故障排查
```

## 技术实现

### 组件修改

**1. 更新 `components/settings/ImageHostingSettings.tsx`**

添加 CMS 自供选项的 UI 逻辑：

```typescript
// 新增状态
const [cmsProvidedBackend, setCmsProvidedBackend] = useState<'jsdelivr' | 'statically'>('jsdelivr')
const [cmsProvidedDomain, setCmsProvidedDomain] = useState('')

// CDN 选项
const cdnOptions = [
  { value: 'jsdelivr', label: 'jsDelivr', description: '全球 CDN，国内不稳定' },
  { value: 'statically', label: 'Statically', description: '全球 CDN，国内不稳定' },
  { value: 'cms-provided', label: 'CMS 自供', description: '通过 Cloudflare DNS 到 jsDelivr/Statically，国内可用' },
]

// 条件渲染：当选择 cms-provided 时显示后端选择和域名选择
{cdnRoute === 'cms-provided' && (
  <>
    <Label>选择后端 CDN</Label>
    <Select value={cmsProvidedBackend} onValueChange={setCmsProvidedBackend}>
      <SelectItem value="jsdelivr">CMS 自供 to jsDelivr</SelectItem>
      <SelectItem value="statically">CMS 自供 to Statically</SelectItem>
    </Select>

    <Label>选择域名</Label>
    <Select value={cmsProvidedDomain} onValueChange={setCmsProvidedDomain}>
      {CMS_CDN_DOMAINS[cmsProvidedBackend].map(domain => (
        <SelectItem key={domain.domain} value={domain.domain}>
          {domain.domain} ({domain.region})
        </SelectItem>
      ))}
    </Select>
  </>
)}
```

**2. 创建 `config/cmsCdnDomains.ts`**

```typescript
export interface CmsCdnDomain {
  domain: string
  region: string
  description: string
}

export const CMS_CDN_DOMAINS: Record<'jsdelivr' | 'statically', CmsCdnDomain[]> = {
  jsdelivr: [
    // 管理员在这里添加指向 jsDelivr 的域名
  ],
  statically: [
    // 管理员在这里添加指向 Statically 的域名
  ],
}
```

**3. 更新 `types/imageHosting.ts`**

```typescript
export type CDNRoute =
  | 'jsdelivr'
  | 'statically'
  | 'github-raw'
  | 'cloudflare'
  | 'custom'
  | 'default'
  | 'cms-provided' // 新增

export interface CmsProvidedConfig {
  backend: 'jsdelivr' | 'statically'
  domain: string
}

export interface ImageHostingConfig {
  enabled: boolean
  repoOwner: string
  repoName: string
  branch: string
  imagePath: string
  cdnRoute: CDNRoute
  cloudflareConfig?: CloudflareConfig
  cmsProvidedConfig?: CmsProvidedConfig // 新增
  useYearMonthFolder: boolean
}
```

**4. 更新 `services/imageHosting/urlGenerator.ts`**

添加 CMS 自供的 URL 生成逻辑：

```typescript
export function generateImageUrl(config: ImageHostingConfig, path: string): string {
  const { cdnRoute, repoOwner, repoName, branch } = config

  // CMS 自供
  if (cdnRoute === 'cms-provided' && config.cmsProvidedConfig) {
    const { domain } = config.cmsProvidedConfig
    return `https://${domain}/gh/${repoOwner}/${repoName}@${branch}/${path}`
  }

  // jsDelivr
  if (cdnRoute === 'jsdelivr') {
    return `https://cdn.jsdelivr.net/gh/${repoOwner}/${repoName}@${branch}/${path}`
  }

  // Statically
  if (cdnRoute === 'statically') {
    return `https://cdn.statically.io/gh/${repoOwner}/${repoName}/${branch}/${path}`
  }

  // ... 其他现有逻辑
}
```

### Cloudflare Workers 代码

用于 CMS 自供域名的 Workers 脚本：

```javascript
// 智能路由到 jsDelivr 或 Statically
const CDN_BACKENDS = {
  jsdelivr: 'https://cdn.jsdelivr.net',
  statically: 'https://cdn.statically.io',
}

// 配置：这个 Worker 路由到哪个后端
const BACKEND = 'jsdelivr' // 或 'statically'

// 中国及周边地区列表
const ASIA_COUNTRIES = ['CN', 'HK', 'TW', 'MO', 'SG', 'JP', 'KR']

addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  const url = new URL(request.url)
  const country = request.cf?.country || 'US'

  // 根据地区选择最优 CDN
  let cdnBase = CDN_BACKENDS[BACKEND]

  // 构建目标 URL
  const targetUrl = `${cdnBase}${url.pathname}`

  // 转发请求
  const response = await fetch(targetUrl, {
    method: request.method,
    headers: request.headers,
  })

  // 添加缓存和 CORS 头
  const newResponse = new Response(response.body, response)
  newResponse.headers.set('Cache-Control', 'public, max-age=31536000')
  newResponse.headers.set('Access-Control-Allow-Origin', '*')
  newResponse.headers.set('X-CDN-Backend', BACKEND)
  newResponse.headers.set('X-User-Country', country)

  return newResponse
}
```

## 实现计划

### 阶段 1：图床 CMS 自供配置

1. 创建 `config/cmsCdnDomains.ts` 配置文件
2. 更新 `types/imageHosting.ts` 类型定义
3. 修改 `ImageHostingSettings.tsx` 添加 UI
4. 更新 `urlGenerator.ts` 添加 URL 生成逻辑
5. 测试图床 CMS 自供功能

### 阶段 2：文档编写

1. 更新 `docs/getting-started.md` 添加简化版说明
2. 创建 `docs/blog-cms-custom-domain.md` 完整教程
3. 创建 `docs/cms-cdn-setup-guide.md` 管理员指南
4. 在 CMS 指南页面添加文档链接

### 阶段 3：测试和优化

1. 测试三种域名配置场景
2. 验证 Cloudflare Workers 路由
3. 优化文档内容和示例
4. 收集用户反馈并改进

## 成功标准

1. **功能完整性**
   - 图床支持 CMS 自供选项
   - 两步选择流程正常工作
   - URL 生成正确

2. **文档完整性**
   - 快速开始包含简化版说明
   - 完整教程覆盖三种场景
   - 管理员指南详细可操作

3. **用户体验**
   - UI 清晰易懂
   - 文档易于跟随
   - 配置流程顺畅

## 风险和缓解

### 风险 1：Cloudflare Workers 配额限制

**风险：** 免费版 Workers 有请求次数限制
**缓解：**
- 使用 CDN 缓存减少 Workers 请求
- 监控使用量
- 必要时升级到付费版

### 风险 2：域名配置复杂度

**风险：** 用户可能不熟悉 DNS 配置
**缓解：**
- 提供详细的图文教程
- 包含常见问题排查
- 提供配置验证工具

### 风险 3：硬编码域名列表维护

**风险：** 添加新域名需要代码变更
**缓解：**
- 文档化添加流程
- 保持域名列表简洁
- 未来可迁移到配置文件

## 未来扩展

1. **动态域名配置**
   - 支持从配置文件读取域名列表
   - 无需代码变更即可添加域名

2. **域名健康检查**
   - 自动检测域名可用性
   - 显示域名状态和延迟

3. **配置向导**
   - 在 CMS 中提供交互式配置向导
   - 自动生成 DNS 配置命令

4. **多区域优化**
   - 根据用户地理位置自动选择最优域名
   - 支持更细粒度的地区路由

## 总结

本设计提供了一个清晰的 CDN 配置系统，将图床 CDN 配置集成到 CMS 界面，同时通过详细文档指导用户配置 Blog/CMS 自定义域名。系统采用分离式架构，职责明确，易于维护和扩展。
