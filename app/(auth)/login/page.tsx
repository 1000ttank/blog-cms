'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Github, Lock, ExternalLink, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuthStore } from '@/store/authStore'
import { APP_NAME, ROUTES } from '@/config/constants'

export default function LoginPage() {
  const router = useRouter()
  const { login, isLoading } = useAuthStore()

  const [token, setToken] = useState('')
  const [owner, setOwner] = useState('')
  const [repo, setRepo] = useState('')
  const [branch, setBranch] = useState('main')
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!token.trim()) {
      setError('请输入 GitHub Personal Access Token')
      return
    }
    if (!owner.trim() || !repo.trim()) {
      setError('请填写仓库信息')
      return
    }

    try {
      await login(token.trim(), {
        owner: owner.trim(),
        repo: repo.trim(),
        branch: branch.trim() || 'main',
        token: token.trim(),
      })
      toast.success('登录成功！')
      router.push(ROUTES.DASHBOARD)
    } catch (err) {
      const msg = err instanceof Error ? err.message : '登录失败，请检查 Token 和仓库信息'
      setError(msg)
      toast.error(msg)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Logo */}
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground text-xl font-bold shadow-lg">
            H
          </div>
          <h1 className="text-2xl font-bold tracking-tight">{APP_NAME}</h1>
          <p className="text-sm text-muted-foreground">
            基于 GitHub 的 Hexo 博客内容管理系统
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Lock className="h-4 w-4" />
              登录 CMS
            </CardTitle>
            <CardDescription>
              使用 GitHub Personal Access Token 认证，Token 将加密存储在本地。
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="token">GitHub Token</Label>
                <Input
                  id="token"
                  type="password"
                  placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  autoComplete="off"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  需要 <code className="bg-muted px-1 rounded">repo</code> 权限。
                  <a
                    href="https://github.com/settings/tokens/new"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-1 inline-flex items-center gap-0.5 text-primary hover:underline"
                  >
                    创建 Token
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="owner">GitHub 用户名</Label>
                  <Input
                    id="owner"
                    placeholder="username"
                    value={owner}
                    onChange={(e) => setOwner(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="repo">仓库名称</Label>
                  <Input
                    id="repo"
                    placeholder="blog"
                    value={repo}
                    onChange={(e) => setRepo(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="branch">分支</Label>
                <Input
                  id="branch"
                  placeholder="main"
                  value={branch}
                  onChange={(e) => setBranch(e.target.value)}
                />
              </div>

              {error && (
                <div className="flex items-start gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    验证中...
                  </>
                ) : (
                  <>
                    <Github className="h-4 w-4" />
                    使用 GitHub Token 登录
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          Token 仅存储在您的浏览器本地，不会上传至任何服务器。
        </p>
      </div>
    </div>
  )
}
