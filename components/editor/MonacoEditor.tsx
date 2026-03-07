'use client'

import { useRef, useEffect, useCallback } from 'react'
import Editor, { OnMount, Monaco } from '@monaco-editor/react'
import type { editor } from 'monaco-editor'
import { toast } from 'sonner'
import { useImageStore } from '@/store/imageStore'

interface MonacoEditorProps {
  value: string
  onChange: (value: string) => void
  theme?: 'light' | 'dark'
  height?: string | number
  language?: string
  readOnly?: boolean
  onMount?: (editor: editor.IStandaloneCodeEditor, monaco: Monaco) => void
}

export function MonacoEditor({
  value,
  onChange,
  theme = 'light',
  height = '100%',
  language = 'markdown',
  readOnly = false,
  onMount,
}: MonacoEditorProps) {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null)
  const monacoRef = useRef<Monaco | null>(null)
  const { config, uploadImage, isUploading } = useImageStore()

  // 处理图片上传
  const handleImageUpload = useCallback(async (file: File) => {
    if (!config) {
      toast.error('请先在设置中配置图床')
      return
    }

    if (isUploading) {
      toast.warning('正在上传中，请稍候...')
      return
    }

    const editor = editorRef.current
    if (!editor) return

    // 插入占位符
    const placeholder = `![上传中...](uploading-${Date.now()})`
    const selection = editor.getSelection()
    if (selection) {
      editor.executeEdits('', [
        {
          range: selection,
          text: placeholder,
        },
      ])
    }

    try {
      const result = await uploadImage(file)

      // 替换占位符为真实 URL
      const model = editor.getModel()
      if (model) {
        const content = model.getValue()
        const newContent = content.replace(placeholder, `![${file.name}](${result.url})`)
        model.setValue(newContent)
        onChange(newContent)
      }

      toast.success('图片上传成功！')
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '未知错误'
      toast.error(`图片上传失败: ${errorMessage}`)

      // 删除占位符
      const model = editor.getModel()
      if (model) {
        const content = model.getValue()
        const newContent = content.replace(placeholder, '')
        model.setValue(newContent)
        onChange(newContent)
      }
    }
  }, [config, isUploading, uploadImage, onChange])

  const insertWrapper = (before: string, after: string) => {
    const editor = editorRef.current
    if (!editor) return

    const selection = editor.getSelection()
    if (!selection) return

    const model = editor.getModel()
    if (!model) return

    const selectedText = model.getValueInRange(selection)

    editor.executeEdits('', [
      {
        range: selection,
        text: `${before}${selectedText}${after}`,
      },
    ])

    // 如果没有选中文本，将光标移到中间
    if (!selectedText) {
      const newPosition = {
        lineNumber: selection.startLineNumber,
        column: selection.startColumn + before.length,
      }
      editor.setPosition(newPosition)
    }

    editor.focus()
  }

  const handleEditorDidMount: OnMount = useCallback((editor, monaco) => {
    editorRef.current = editor
    monacoRef.current = monaco

    console.log('[MonacoEditor] Editor mounted')

    // 配置编辑器选项
    editor.updateOptions({
      fontSize: 14,
      lineHeight: 24,
      fontFamily: '"JetBrains Mono", "Fira Code", "Cascadia Code", "SF Mono", Monaco, Menlo, Consolas, monospace',
      fontLigatures: true,
      minimap: { enabled: false },
      wordWrap: 'on',
      lineNumbers: 'on',
      renderWhitespace: 'selection',
      scrollBeyondLastLine: false,
      automaticLayout: true,
      tabSize: 2,
      insertSpaces: true,
      formatOnPaste: true,
      formatOnType: true,
      quickSuggestions: {
        other: true,
        comments: true,
        strings: true,
      },
      suggestOnTriggerCharacters: true,
      acceptSuggestionOnEnter: 'on',
      snippetSuggestions: 'inline',
    })

    // 添加 Markdown 快捷键
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyB, () => {
      insertWrapper('**', '**')
    })

    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyI, () => {
      insertWrapper('*', '*')
    })

    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyK, () => {
      insertWrapper('[', '](url)')
    })

    // 在编辑器挂载后立即添加粘贴和拖拽事件监听
    const domNode = editor.getDomNode()
    if (domNode) {
      console.log('[MonacoEditor] Adding paste and drop listeners to editor')

      // 粘贴处理
      const handlePaste = async (e: Event) => {
        const clipboardEvent = e as ClipboardEvent
        console.log('[MonacoEditor] Paste event triggered')

        const items = clipboardEvent.clipboardData?.items
        if (!items) {
          console.log('[MonacoEditor] No clipboardData.items')
          return
        }

        console.log('[MonacoEditor] ClipboardData items count:', items.length)

        // 检查是否有图片
        let hasImage = false
        for (let i = 0; i < items.length; i++) {
          const item = items[i]
          console.log('[MonacoEditor] Item', i, '- kind:', item.kind, 'type:', item.type)

          if (item.kind === 'file' && item.type.startsWith('image/')) {
            hasImage = true
            e.preventDefault()
            e.stopPropagation()

            console.log('[MonacoEditor] Image detected, type:', item.type)
            const file = item.getAsFile()
            if (file) {
              console.log('[MonacoEditor] Image file size:', file.size, 'bytes')
              console.log('[MonacoEditor] Starting image upload...')
              await handleImageUpload(file)
              console.log('[MonacoEditor] Image upload completed')
              return
            }
          }
        }

        if (!hasImage) {
          console.log('[MonacoEditor] No image found, allowing default paste')
        }
      }

      // 拖拽处理
      const handleDrop = async (e: DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        console.log('[MonacoEditor] Drop event triggered')

        const files = e.dataTransfer?.files
        if (!files || files.length === 0) {
          console.log('[MonacoEditor] No files in drop event')
          return
        }

        console.log('[MonacoEditor] Dropped files count:', files.length)
        for (const file of Array.from(files)) {
          console.log('[MonacoEditor] File type:', file.type, 'name:', file.name)
          if (file.type.startsWith('image/')) {
            console.log('[MonacoEditor] Image file detected, starting upload...')
            await handleImageUpload(file)
            console.log('[MonacoEditor] Image upload completed')
          }
        }
      }

      const handleDragOver = (e: DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
      }

      domNode.addEventListener('paste', handlePaste, true)
      domNode.addEventListener('drop', handleDrop)
      domNode.addEventListener('dragover', handleDragOver)

      console.log('[MonacoEditor] Event listeners added successfully')
    }

    // 调用外部 onMount 回调
    if (onMount) {
      onMount(editor, monaco)
    }
  }, [handleImageUpload, onMount])

  const handleChange = (value: string | undefined) => {
    onChange(value ?? '')
  }

  return (
    <Editor
      height={height}
      language={language}
      value={value}
      onChange={handleChange}
      theme={theme === 'dark' ? 'vs-dark' : 'vs'}
      onMount={handleEditorDidMount}
      options={{
        readOnly,
      }}
      loading={
        <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
          加载编辑器中...
        </div>
      }
    />
  )
}
