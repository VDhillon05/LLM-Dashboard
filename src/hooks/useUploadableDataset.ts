import { useState } from 'react'
import type { RawDataset } from '@/types/benchmark'

export function useUploadableDataset<T>(
  defaultDataset: RawDataset<T>,
  parse: (file: File) => Promise<RawDataset<T>>,
) {
  const [dataset, setDataset] = useState<RawDataset<T>>(defaultDataset)
  const [isCustom, setIsCustom] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function uploadFile(file: File) {
    try {
      const parsed = await parse(file)
      setDataset(parsed)
      setIsCustom(true)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not parse that file.')
    }
  }

  function resetToDefault() {
    setDataset(defaultDataset)
    setIsCustom(false)
    setError(null)
  }

  return { dataset, isCustom, error, uploadFile, resetToDefault }
}
