'use client'

import { format } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { PenSquare, Trash2, Send, EyeOff, Calendar, Tag } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import type { PostListItem } from '@/types'

interface PostCardProps {
  post: PostListItem
  onEdit: () => void
  onDelete: () => void
  onPublish?: () => void
  onUnpublish?: () => void
}

export function PostCard({ post, onEdit, onDelete, onPublish, onUnpublish }: PostCardProps) {
  const formattedDate = (() => {
    try {
      return format(new Date(post.date), 'yyyy-MM-dd', { locale: zhCN })
    } catch {
      return post.date
    }
  })()

  return (
    <Card className="group transition-shadow hover:shadow-md">
      <CardContent className="flex items-start justify-between gap-4 p-4">
        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <h3
              className="font-medium text-sm cursor-pointer hover:text-primary transition-colors truncate max-w-md"
              onClick={onEdit}
            >
              {post.title}
            </h3>
            {post.isDraft ? (
              <Badge variant="secondary" className="text-xs shrink-0">
                草稿
              </Badge>
            ) : (
              <Badge
                variant="default"
                className="text-xs shrink-0 bg-green-500/10 text-green-600 border-green-500/20 hover:bg-green-500/20"
              >
                已发布
              </Badge>
            )}
          </div>

          {post.description && (
            <p className="text-xs text-muted-foreground line-clamp-1">{post.description}</p>
          )}

          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {formattedDate}
            </span>

            {post.tags.length > 0 && (
              <span className="flex items-center gap-1">
                <Tag className="h-3 w-3" />
                {post.tags.slice(0, 3).join(', ')}
                {post.tags.length > 3 && ` +${post.tags.length - 3}`}
              </span>
            )}

            <span className="font-mono text-muted-foreground/60 truncate max-w-48">
              {post.filename}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={onEdit}
            title="编辑"
          >
            <PenSquare className="h-3.5 w-3.5" />
          </Button>

          {onPublish && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50"
              onClick={onPublish}
              title="发布"
            >
              <Send className="h-3.5 w-3.5" />
            </Button>
          )}

          {onUnpublish && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-amber-600 hover:text-amber-700 hover:bg-amber-50"
              onClick={onUnpublish}
              title="移至草稿"
            >
              <EyeOff className="h-3.5 w-3.5" />
            </Button>
          )}

          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={onDelete}
            title="删除"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
