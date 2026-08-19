import { useState } from 'react'
import type { ThroughputBenchmark } from '@/types/benchmark'
import { parseThroughputBenchmark } from '@/utils/validateBenchmark'

export function useThroughputData(defaultData: ThroughputBenchmark) {
  const [data, setData] = useState<ThroughputBenchmark>(defaultData)
  const [isCustom, setIsCustom] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function uploadFile(file: File) {
    try {
      const text = await file.text()
      const parsed = parseThroughputBenchmark(JSON.parse(text))
      setData(parsed)
      setIsCustom(true)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not parse that file.')
    }
  }

  function resetToDefault() {
    setData(defaultData)
    setIsCustom(false)
    setError(null)
  }

  return { data, isCustom, error, uploadFile, resetToDefault }
}
