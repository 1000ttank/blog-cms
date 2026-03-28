# Katex 开关控制功能实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为每篇文章提供独立的 Katex 开关，默认开启，方便用户控制数学公式渲染

**Architecture:** 在 FrontmatterForm 中添加 Katex 开关控件，根据 frontmatter.katex 字段动态控制 Markdown 预览中的 Katex 插件启用/禁用

**Tech Stack:** React, TypeScript, shadcn/ui Switch

---

## 文件结构

- `types/index.ts` - 添加 `katex?: boolean` 到 `PostInput` 接口
- `components/post/FrontmatterForm.tsx` - 添加 Katex 开关控件
- `components/post/PostEditor.tsx` - 根据开关动态控制 Katex 插件

---

### Task 1: 添加 Katex 字段到 PostInput 类型

**Files:**
- Modify: `types/index.ts:76-85`

- [ ] **Step 1: 添加 katex 字段到 PostInput 接口**

```typescript
export interface PostInput {
  title: string
  body: string
  tags?: string[]
  categories?: string[]
  draft?: boolean
  description?: string
  cover?: string
  slug?: string
  katex?: boolean  // 新增：控制数学公式渲染
}
```

- [ ] **Step 2: 提交更改**

```bash
git add types/index.ts
git commit -m "feat: add katex field to PostInput type

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 2: 在 FrontmatterForm 中添加 Katex 开关

**Files:**
- Modify: `components/post/FrontmatterForm.tsx:171-184`

- [ ] **Step 1: 在 Draft 开关之后添加 Katex 开关**

在 `<div className="flex items-center justify-between">` (Draft 开关) 之后添加：

```tsx
{/* Katex */}
<div className="flex items-center justify-between pt-3 border-t">
  <div>
    <Label htmlFor="fm-katex" className="cursor-pointer">
      启用 Katex
    </Label>
    <p className="text-xs text-muted-foreground">渲染数学公式（$...$ 和 $$...$$）</p>
  </div>
  <Switch
    id="fm-katex"
    checked={value.katex ?? true}
    onCheckedChange={(checked) => update({ katex: checked })}
  />
</div>
```

- [ ] **Step 2: 提交更改**

```bash
git add components/post/FrontmatterForm.tsx
git commit -m "feat: add katex toggle to FrontmatterForm

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 3: 在 PostEditor 中动态控制 Katex 插件

**Files:**
- Modify: `components/post/PostEditor.tsx:68-76`
- Modify: `components/post/PostEditor.tsx:265-271`

- [ ] **Step 1: 添加 katex 字段到 frontmatter state**

在 `PostEditor.tsx` 第 68-76 行的 `useState` 中添加 katex 字段：

```typescript
const [frontmatter, setFrontmatter] = useState<Omit<PostInput, 'body'>>({
  title: post?.frontmatter.title ?? '',
  tags: (post?.frontmatter.tags ?? []) as string[],
  categories: (post?.frontmatter.categories ?? []) as string[],
  draft: post?.isDraft ?? false,
  description: post?.frontmatter.description as string | undefined,
  cover: post?.frontmatter.cover as string | undefined,
  slug: post?.frontmatter.slug as string | undefined,
  katex: post?.frontmatter.katex as boolean | undefined,  // 新增
})
```

- [ ] **Step 2: 在同步逻辑中添加 katex 字段**

在 useEffect 同步逻辑中添加（第 86-94 行）：

```typescript
setFrontmatter({
  title: post.frontmatter.title ?? '',
  tags: (post.frontmatter.tags ?? []) as string[],
  categories: (post.frontmatter.categories ?? []) as string[],
  draft: post.isDraft,
  description: post.frontmatter.description as string | undefined,
  cover: post.frontmatter.cover as string | undefined,
  slug: post.frontmatter.slug as string | undefined,
  katex: post.frontmatter.katex as boolean | undefined,  // 新增
})
```

- [ ] **Step 3: 动态控制 Katex 插件**

修改 `MarkdownPreview` 组件（第 265-271 行），根据 frontmatter.katex 决定是否启用插件：

```typescript
<MarkdownPreview
  source={body}
  style={{ background: 'transparent' }}
  wrapperElement={{ 'data-color-mode': resolvedTheme } as React.HTMLAttributes<HTMLDivElement>}
  {...(frontmatter.katex !== false
    ? {
        rehypePlugins: [[rehypeKatex, { strict: false }]],
        remarkPlugins: [remarkMath],
      }
    : {})}
/>
```

- [ ] **Step 4: 提交更改**

```bash
git add components/post/PostEditor.tsx
git commit -m "feat: add dynamic katex control in PostEditor

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 4: 验证构建

- [ ] **Step 1: 运行类型检查**

```bash
cd blog-cms && npm run type-check
```

- [ ] **Step 2: 运行构建**

```bash
cd blog-cms && npm run build
```

- [ ] **Step 3: 提交验证提交**

```bash
git commit --allow-empty -m "chore: verify build passes

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```