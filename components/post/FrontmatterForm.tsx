'use client'

import { useState } from 'react'
import { X, Plus } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { generateSlug } from '@/lib/frontmatter'
import type { PostInput } from '@/types'

interface FrontmatterFormProps {
  value: Omit<PostInput, 'body'>
  onChange: (value: Omit<PostInput, 'body'>) => void
}

export function FrontmatterForm({ value, onChange }: FrontmatterFormProps) {
  const [tagInput, setTagInput] = useState('')
  const [categoryInput, setCategoryInput] = useState('')

  function update(patch: Partial<Omit<PostInput, 'body'>>) {
    onChange({ ...value, ...patch })
  }

  function handleTitleChange(title: string) {
    const slug = generateSlug(title)
    update({ title, slug })
  }

  function addTag() {
    const tag = tagInput.trim()
    if (!tag) return
    const tags = value.tags ?? []
    if (!tags.includes(tag)) {
      update({ tags: [...tags, tag] })
    }
    setTagInput('')
  }

  function removeTag(tag: string) {
    update({ tags: (value.tags ?? []).filter((t) => t !== tag) })
  }

  function addCategory() {
    const cat = categoryInput.trim()
    if (!cat) return
    const categories = value.categories ?? []
    if (!categories.includes(cat)) {
      update({ categories: [...categories, cat] })
    }
    setCategoryInput('')
  }

  function removeCategory(cat: string) {
    update({ categories: (value.categories ?? []).filter((c) => c !== cat) })
  }

  return (
    <div className="space-y-4">
      {/* Title */}
      <div className="space-y-1.5">
        <Label htmlFor="fm-title">标题 *</Label>
        <Input
          id="fm-title"
          placeholder="文章标题"
          value={value.title}
          onChange={(e) => handleTitleChange(e.target.value)}
        />
      </div>

      {/* Slug */}
      <div className="space-y-1.5">
        <Label htmlFor="fm-slug">Slug（URL路径）</Label>
        <Input
          id="fm-slug"
          placeholder="auto-generated-from-title"
          value={value.slug ?? ''}
          onChange={(e) => update({ slug: e.target.value })}
        />
        <p className="text-xs text-muted-foreground">留空则自动从标题生成</p>
      </div>

      {/* Description */}
      <div className="space-y-1.5">
        <Label htmlFor="fm-desc">摘要描述</Label>
        <Textarea
          id="fm-desc"
          placeholder="文章简短描述（用于 SEO 和列表预览）"
          value={value.description ?? ''}
          onChange={(e) => update({ description: e.target.value })}
          rows={2}
        />
      </div>

      {/* Tags */}
      <div className="space-y-1.5">
        <Label>标签</Label>
        <div className="flex gap-2">
          <Input
            placeholder="输入标签后按回车"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                addTag()
              }
            }}
          />
          <Button type="button" variant="outline" size="icon" onClick={addTag}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        {(value.tags ?? []).length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {(value.tags ?? []).map((tag) => (
              <Badge key={tag} variant="secondary" className="gap-1 pr-1">
                {tag}
                <button
                  type="button"
                  onClick={() => removeTag(tag)}
                  className="ml-0.5 rounded-full hover:bg-muted"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Categories */}
      <div className="space-y-1.5">
        <Label>分类</Label>
        <div className="flex gap-2">
          <Input
            placeholder="输入分类后按回车"
            value={categoryInput}
            onChange={(e) => setCategoryInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                addCategory()
              }
            }}
          />
          <Button type="button" variant="outline" size="icon" onClick={addCategory}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        {(value.categories ?? []).length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {(value.categories ?? []).map((cat) => (
              <Badge key={cat} variant="outline" className="gap-1 pr-1">
                {cat}
                <button
                  type="button"
                  onClick={() => removeCategory(cat)}
                  className="ml-0.5 rounded-full hover:bg-muted"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Draft */}
      <div className="flex items-center justify-between">
        <div>
          <Label htmlFor="fm-draft" className="cursor-pointer">
            保存为草稿
          </Label>
          <p className="text-xs text-muted-foreground">草稿存储于 source/_drafts/</p>
        </div>
        <Switch
          id="fm-draft"
          checked={value.draft ?? false}
          onCheckedChange={(checked) => update({ draft: checked })}
        />
      </div>

      {/* Cover Image */}
      <div className="space-y-1.5">
        <Label htmlFor="fm-cover">封面图片 URL</Label>
        <Input
          id="fm-cover"
          placeholder="https://example.com/cover.jpg"
          value={value.cover ?? ''}
          onChange={(e) => update({ cover: e.target.value })}
        />
      </div>
    </div>
  )
}
