# 编辑器功能增强实现计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 实现两个编辑器功能：1) Katex 数学公式支持（用户可选）2) 窄视口下自动折叠侧边栏，点击按钮弹出

**Architecture:** 在 FrontmatterForm 中添加 Katex 复选框；在 PostEditor 中添加视口宽度检测和 Sheet 弹窗。使用 shadcn/ui 的 Sheet 组件实现侧边栏弹窗。

**Tech Stack:** React, TypeScript, Next.js 15, shadcn/ui (Sheet), Zustand

---

## Task 1: 检查 FrontmatterForm 组件

**Files:**
- Modify: `blog-cms/components/post/FrontmatterForm.tsx`

**Step 1: 阅读 FrontmatterForm 组件**

查看组件的当前结构，了解如何添加新的表单字段。

```bash
cat blog-cms/components/post/FrontmatterForm.tsx
```

**Step 2: 确认组件导出**

确保组件导出方式正确，PostEditor 可以正确导入使用。

---

## Task 2: 添加 Katex 复选框

**Files:**
- Modify: `blog-cms/components/post/FrontmatterForm.tsx`

**Step 1: 添加 Checkbox 导入**

在文件顶部添加 shadcn/ui Checkbox 组件导入：

```typescript
import { Checkbox } from '@/components/ui/checkbox'
```

**Step 2: 添加状态**

在组件中添加 enableMath 状态：

```typescript
const [enableMath, setEnableMath] = useState(false)
```

**Step 3: 添加复选框 UI**

在表单中添加 Katex 复选框（通常在 categories 之后）：

```tsx
<div className="flex items-center space-x-2">
  <Checkbox
    id="math"
    checked={enableMath}
    onCheckedChange={(checked) => setEnableMath(checked as boolean)}
  />
  <Label htmlFor="math" className="text-sm font-normal">
    启用数学公式 (Katex)
  </Label>
</div>
```

**Step 4: 传递值到父组件**

确保 enableMath 的值可以通过 props 或 form 传递给 PostEditor。

修改 FrontmatterForm 的 props 类型，添加 onMathChange 回调：

```typescript
interface FrontmatterFormProps {
  // ... existing props
  enableMath?: boolean
  onMathChange?: (enabled: boolean) => void
}
```

在 PostEditor 中：

```tsx
const [enableMath, setEnableMath] = useState(false)

// 在 FrontmatterForm 使用
<FrontmatterForm
  // ... other props
  enableMath={enableMath}
  onMathChange={setEnableMath}
/>
```

**Step 5: 提交**

```bash
git add components/post/FrontmatterForm.tsx
git commit -m "feat: add Katex checkbox to frontmatter form"
```

---

## Task 3: 更新 Post 类型定义

**Files:**
- Modify: `blog-cms/types/index.ts`

**Step 1: 查找 PostFrontmatter 类型**

确认 frontmatter 的类型定义位置。

**Step 2: 添加 math 字段**

在 PostFrontmatter 类型中添加可选的 math 字段：

```typescript
math?: boolean
```

**Step 3: 提交**

```bash
git add types/index.ts
git commit -m "feat: add math field to post frontmatter type"
```

---

## Task 4: 在 PostEditor 中处理 math 字段

**Files:**
- Modify: `blog-cms/components/post/PostEditor.tsx`

**Step 1: 添加 enableMath 状态**

在 PostEditor 组件中添加状态：

```typescript
const [enableMath, setEnableMath] = useState(false)
```

**Step 2: 传递到 FrontmatterForm**

确保 FrontmatterForm 接收 enableMath 和 onMathChange：

```tsx
<FrontmatterForm
  // ... other props
  enableMath={enableMath}
  onMathChange={setEnableMath}
/>
```

**Step 3: 在保存时包含 math 字段**

在 createPost 或 updatePost 调用中包含 math 值。查看现有代码如何处理 frontmatter，确保 math 字段被正确传递。

**Step 4: 提交**

```bash
git add components/post/PostEditor.tsx
git commit -m "feat: handle math field in post editor"
```

---

## Task 5: 检查 Sheet 组件是否已安装

**Files:**
- Check: `blog-cms/components/ui/sheet.tsx`

**Step 1: 检查 Sheet 组件**

```bash
ls blog-cms/components/ui/sheet.tsx
```

如果不存在，需要安装：

```bash
npx shadcn@latest add sheet
```

---

## Task 6: 实现窄视口侧边栏折叠

**Files:**
- Modify: `blog-cms/components/post/PostEditor.tsx`

**Step 1: 导入必要的组件**

```typescript
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { PanelLeft } from 'lucide-react'
import { useUIStore } from '@/store/uiStore'
```

**Step 2: 添加状态**

```typescript
const [sidebarSheetOpen, setSidebarSheetOpen] = useState(false)
const { sidebarOpen, setSidebarOpen } = useUIStore()
```

**Step 3: 添加视口宽度检测**

在 PostEditor 组件中添加 useEffect：

```typescript
useEffect(() => {
  const SIDEBAR_BREAKPOINT = 1024

  const handleResize = () => {
    if (typeof window !== 'undefined' && window.innerWidth < SIDEBAR_BREAKPOINT) {
      setSidebarOpen(false)
    }
  }

  // 初始检查
  handleResize()

  // 监听窗口变化
  window.addEventListener('resize', handleResize)
  return () => window.removeEventListener('resize', handleResize)
}, [setSidebarSheetOpen])
```

**Step 4: 添加工具栏按钮**

在工具栏区域添加"显示侧边栏"按钮：

```tsx
<Button
  variant="ghost"
  size="icon"
  onClick={() => setSidebarSheetOpen(true)}
  title="显示侧边栏"
>
  <PanelLeft className="h-4 w-4" />
</Button>
```

**Step 5: 添加 Sheet 弹窗**

在 PostEditor 返回的 JSX 中添加 Sheet 组件：

```tsx
<Sheet open={sidebarSheetOpen} onOpenChange={setSidebarSheetOpen}>
  <SheetContent side="left" className="w-60 p-0">
    <Sidebar />
  </SheetContent>
</Sheet>
```

注意：可能需要将 Sidebar 组件改为客户端组件或提取侧边栏内容到一个独立组件。

**Step 6: 提交**

```bash
git add components/post/PostEditor.tsx
git commit -m "feat: add responsive sidebar collapse and popup for editor"
```

---

## Task 7: 测试 Katex 功能

**Step 1: 运行开发服务器**

```bash
npm run dev
```

**Step 2: 手动测试**

1. 访问 `/editor/new`
2. 在 frontmatter 表单中找到"启用数学公式"复选框
3. 勾选复选框
4. 填写标题和其他必填字段
5. 保存文章
6. 检查保存的 Markdown 文件，确认 frontmatter 包含 `math: true`

**Step 3: 测试不勾选**

1. 取消勾选"启用数学公式"
2. 保存文章
3. 确认 frontmatter 不包含 `math` 字段

---

## Task 8: 测试窄视口侧边栏

**Step 1: 调整浏览器窗口宽度**

将浏览器窗口宽度调整到小于 1024px。

**Step 2: 验证自动折叠**

刷新页面，确认侧边栏自动折叠。

**Step 3: 测试工具栏按钮**

1. 在工具栏找到"显示侧边栏"按钮
2. 点击按钮，确认 Sheet 弹窗出现
3. 确认弹窗显示侧边栏内容
4. 点击关闭按钮或遮罩层，确认弹窗关闭

**Step 4: 测试宽视口**

将窗口宽度调整到大于 1024px，刷新页面，确认侧边栏正常展开。

---

## Task 9: 最终提交

```bash
git add .
git commit -m "feat: add Katex support and responsive sidebar for editor"
```
