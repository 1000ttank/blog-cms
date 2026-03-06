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

  const handleEditorDidMount: OnMount = (editor, monaco) => {
    editorRef.current = editor
    monacoRef.current = monaco

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

    // 调用外部 onMount 回调
    if (onMount) {
      onMount(editor, monaco)
    }
  }

  const handleChange = (value: string | undefined) => {
    onChange(value ?? '')
  }

  // 设置拖拽和粘贴事件
  useEffect(() => {
    const editor = editorRef.current
    if (!editor) return

    const domNode = editor.getDomNode()
    if (!domNode) return

    const handleDrop = async (e: DragEvent) => {
      e.preventDefault()
      e.stopPropagation()

      const files = e.dataTransfer?.files
      if (!files || files.length === 0) return

      for (const file of Array.from(files)) {
        if (file.type.startsWith('image/')) {
          await handleImageUpload(file)
        }
      }
    }

    const handleDragOver = (e: DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
    }

    const handlePasteEvent = async (e: Event) => {
      const clipboardEvent = e as ClipboardEvent
      const items = clipboardEvent.clipboardData?.items
      if (!items) return

      for (let i = 0; i < items.length; i++) {
        const item = items[i]
        if (item.type.startsWith('image/')) {
          e.preventDefault()
          e.stopPropagation()
          const file = item.getAsFile()
          if (file) {
            await handleImageUpload(file)
            return
          }
        }
      }
    }

    domNode.addEventListener('drop', handleDrop)
    domNode.addEventListener('dragover', handleDragOver)
    domNode.addEventListener('paste', handlePasteEvent)

    return () => {
      domNode.removeEventListener('drop', handleDrop)
      domNode.removeEventListener('dragover', handleDragOver)
      domNode.removeEventListener('paste', handlePasteEvent)
    }
  }, [handleImageUpload])

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
