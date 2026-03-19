# 编辑器功能增强设计文档

**日期：** 2026-03-19
**状态：** 已批准
**作者：** Claude (Kiro)

## 概述

本设计文档描述了两个编辑器功能的增强：
1. 自动添加文章头：Katex 支持
2. 窄视口下自动折叠侧边栏，点击按钮弹出

## 功能 1：Katex 支持

### 需求

用户在创建新文章时，可以选择是否启用数学公式支持。

### UI 设计

在文章的 frontmatter 表单中添加复选框：

```tsx
// FrontmatterForm 组件中
<Checkbox
  id="math"
  checked={enableMath}
  onCheckedChange={setEnableMath}
/>
<Label htmlFor="math">启用数学公式 (Katex)</Label>
```

### 数据流

1. 用户勾选"启用数学公式"
2. 保存文章时，在 frontmatter 中添加 `math: true`
3. 不勾选则不添加该字段

### 示例输出

```yaml
---
title: 我的数学文章
date: 2026-03-19
tags: []
categories: []
math: true
---
```

## 功能 2：窄视口侧边栏处理

### 需求

当视口宽度小于 1024px 时，编辑器页面自动折叠侧边栏，提供更大的编辑空间。用户可以通过工具栏按钮以弹窗形式展开侧边栏。

### 响应式断点

```typescript
const SIDEBAR_BREAKPOINT = 1024  // px
```

### UI 设计

#### 1. 自动折叠逻辑

在编辑器页面中使用 useEffect 监听视口宽度：

```tsx
useEffect(() => {
  const handleResize = () => {
    if (window.innerWidth < SIDEBAR_BREAKPOINT) {
      // 强制折叠侧边栏
      useUIStore.getState().setSidebarOpen(false)
    }
  }

  // 初始检查
  handleResize()

  // 监听窗口变化
  window.addEventListener('resize', handleResize)
  return () => window.removeEventListener('resize', handleResize)
}, [])
```

#### 2. 工具栏添加按钮

在 PostEditor 工具栏添加"显示侧边栏"按钮：

```tsx
<Button
  variant="ghost"
  size="icon"
  onClick={() => setShowSidebarSheet(true)}
  title="显示侧边栏"
>
  <PanelLeft className="h-4 w-4" />
</Button>
```

#### 3. Sheet 弹窗组件

使用 shadcn/ui 的 Sheet 组件以侧边抽屉形式显示侧边栏：

```tsx
<Sheet open={showSidebarSheet} onOpenChange={setShowSidebarSheet}>
  <SheetContent side="left" className="w-60 p-0">
    {/* 侧边栏内容 */}
    <SidebarContent />
  </SheetContent>
</Sheet>
```

### 状态管理

扩展 `uiStore` 以支持编辑器的特殊状态：

```typescript
interface UIStore {
  sidebarOpen: boolean
  toggleSidebar: () => void
  setSidebarOpen: (open: boolean) => void
}
```

注意：Sheet 状态可以保持在 PostEditor 组件的本地状态，不需要放到全局 store。

### 交互流程

1. 用户打开编辑器页面
2. 如果视口宽度 < 1024px，侧边栏自动折叠
3. 用户点击工具栏的"显示侧边栏"按钮
4. 侧边栏以 Sheet 弹窗形式显示
5. 用户可以点击遮罩层或关闭按钮隐藏 Sheet
6. 隐藏 Sheet 后，侧边栏保持折叠状态

### 注意事项

- 只在编辑器页面应用此逻辑，其他页面保持原有行为
- Sheet 弹窗显示的是完整侧边栏内容
- 折叠状态应该在页面加载时检测

## 实现计划

### Task 1: 添加 Katex 复选框

1. 修改 `FrontmatterForm` 组件，添加 math 复选框
2. 更新 Post 类型定义中的 frontmatter
3. 测试文章创建流程

### Task 2: 实现窄视口侧边栏折叠

1. 在 PostEditor 组件中添加视口宽度检测
2. 导入并使用 Sheet 组件
3. 添加工具栏按钮
4. 测试响应式行为

### Task 3: 测试和优化

1. 端到端测试
2. 修复发现的问题
3. 用户反馈收集
