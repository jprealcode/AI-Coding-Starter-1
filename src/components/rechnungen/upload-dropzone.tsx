'use client'

import { useRef, useState, useCallback } from 'react'
import { Upload, X, FileText, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'

const MAX_FILE_SIZE = 20 * 1024 * 1024 // 20 MB

interface PendingFile {
  file: File
  id: string
}

interface ValidationError {
  name: string
  reason: string
}

interface UploadDropzoneProps {
  onUploaded?: () => void
}

export function UploadDropzone({ onUploaded }: UploadDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([])
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  const validateAndAddFiles = useCallback((files: File[]) => {
    const valid: PendingFile[] = []
    const invalid: ValidationError[] = []

    for (const file of files) {
      if (file.type !== 'application/pdf') {
        invalid.push({ name: file.name, reason: 'Nur PDF-Dateien erlaubt' })
      } else if (file.size > MAX_FILE_SIZE) {
        invalid.push({ name: file.name, reason: 'Datei zu groß (max. 20 MB)' })
      } else {
        valid.push({ file, id: crypto.randomUUID() })
      }
    }

    setValidationErrors(invalid)
    setPendingFiles((prev) => {
      const existing = new Set(prev.map((f) => `${f.file.name}-${f.file.size}`))
      const newFiles = valid.filter((f) => !existing.has(`${f.file.name}-${f.file.size}`))
      return [...prev, ...newFiles]
    })
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      validateAndAddFiles(Array.from(e.dataTransfer.files))
    },
    [validateAndAddFiles]
  )

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      validateAndAddFiles(Array.from(e.target.files ?? []))
      e.target.value = ''
    },
    [validateAndAddFiles]
  )

  const removeFile = useCallback((id: string) => {
    setPendingFiles((prev) => prev.filter((f) => f.id !== id))
  }, [])

  const handleUpload = async () => {
    if (pendingFiles.length === 0 || isUploading) return
    setIsUploading(true)
    setUploadError(null)

    try {
      for (const { file } of pendingFiles) {
        const formData = new FormData()
        formData.append('file', file)
        const res = await fetch('/api/rechnungen/upload', { method: 'POST', body: formData })
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          throw new Error(data.error ?? `Upload fehlgeschlagen: ${file.name}`)
        }
      }
      setPendingFiles([])
      onUploaded?.()
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload fehlgeschlagen')
    } finally {
      setIsUploading(false)
    }
  }

  const formatSize = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <div className="space-y-3">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
          isDragging
            ? 'border-indigo-400 bg-indigo-50'
            : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf"
          multiple
          className="hidden"
          onChange={handleInputChange}
        />
        <Upload
          className={`h-8 w-8 mx-auto mb-3 ${isDragging ? 'text-indigo-500' : 'text-slate-300'}`}
        />
        <p className="text-sm font-medium text-slate-600">
          {isDragging ? 'Dateien hier ablegen' : 'PDF hier ablegen oder'}
        </p>
        {!isDragging && (
          <p className="text-sm text-indigo-600 font-medium mt-0.5">Datei auswählen</p>
        )}
        <p className="text-xs text-slate-400 mt-2">Nur PDF · max. 20 MB · Mehrere Dateien möglich</p>
      </div>

      {validationErrors.length > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {validationErrors.map((e) => `${e.name}: ${e.reason}`).join(' · ')}
          </AlertDescription>
        </Alert>
      )}

      {uploadError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{uploadError}</AlertDescription>
        </Alert>
      )}

      {pendingFiles.length > 0 && (
        <div className="space-y-2">
          {pendingFiles.map(({ file, id }) => (
            <div
              key={id}
              className="flex items-center gap-3 px-3 py-2 bg-white border border-slate-200 rounded-lg"
            >
              <FileText className="h-4 w-4 text-slate-400 shrink-0" />
              <span className="text-sm text-slate-700 flex-1 truncate">{file.name}</span>
              <span className="text-xs text-slate-400 shrink-0">{formatSize(file.size)}</span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  removeFile(id)
                }}
                className="text-slate-400 hover:text-slate-600 transition-colors"
                aria-label={`${file.name} entfernen`}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
          <Button
            onClick={handleUpload}
            disabled={isUploading}
            className="w-full bg-indigo-600 hover:bg-indigo-700"
          >
            {isUploading
              ? 'Wird hochgeladen…'
              : `${pendingFiles.length} ${pendingFiles.length === 1 ? 'Datei' : 'Dateien'} hochladen`}
          </Button>
        </div>
      )}
    </div>
  )
}
