# Katex 默认开启 + 开关控制功能设计

## 概述

为每篇文章提供独立的 Katex 开关，默认开启，方便用户控制数学公式渲染。

## 当前状态

- `PostEditor.tsx` 中已集成 `rehypeKatex` + `remarkMath`
- 目前强制开启，无法关闭

## 设计方案

### 1. FrontmatterForm 添加 Katex 开关

在右侧栏"文章信息"中添加开关控件：

```tsx
{/* Katex */}
<div className="flex items-center justify-between">
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

### 2. PostInput 类型扩展

在 `types/index.ts` 中扩展 `PostInput`：

```ts
interface PostInput {
  // ... existing
  katex?: boolean  // 新增
}
```

### 3. PostEditor 动态控制

根据 frontmatter 中的 `katex` 字段动态启用/禁用插件：

```tsx
const katexPlugins = frontmatter.katex !== false
  ? { rehypePlugins: [[rehypeKatex, { strict: false }]], remarkPlugins: [remarkMath] }
  : {}

<MarkdownPreview
  source={body}
  {...katexPlugins}
/>
```

### 4. 默认值

- **新文章**：`katex: true`（默认开启）
- **编辑现有文章**：读取 frontmatter 中的值，如果未设置则默认为 true

## 修改文件

1. `types/index.ts` - 添加 `katex?: boolean` 到 `PostInput`
2. `components/post/FrontmatterForm.tsx` - 添加 Katex 开关
3. `components/post/PostEditor.tsx` - 动态控制插件启用