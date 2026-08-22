import { useRef } from 'react'
import { RotateCcw, Upload } from 'lucide-react'

interface DatasetUploadControlsProps {
  isCustom: boolean
  onUpload: (file: File) => void
  onReset: () => void
}

export function DatasetUploadControls({
  isCustom,
  onUpload,
  onReset,
}: DatasetUploadControlsProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (file) onUpload(file)
    event.target.value = ''
  }

  return (
    <div className="flex items-center gap-1">
      {isCustom && (
        <button
          type="button"
          onClick={onReset}
          title="Reset to cached results"
          className="rounded p-1.5 text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-200"
        >
          <RotateCcw className="h-3.5 w-3.5" />
        </button>
      )}
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        title="Upload a .json or .csv results file"
        className="rounded p-1.5 text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-200"
      >
        <Upload className="h-3.5 w-3.5" />
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept=".json,.csv,application/json,text/csv"
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  )
}
