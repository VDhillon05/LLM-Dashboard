import type { ThroughputBenchmark, ThroughputEntry } from '@/types/benchmark'

const FAMILIES = new Set(['Llama', 'Phi', 'Qwen'])
const QUANTIZATIONS = new Set(['FP16', 'Q8_0', 'Q4_K_M'])

function isThroughputEntry(value: unknown): value is ThroughputEntry {
  if (typeof value !== 'object' || value === null) return false
  const entry = value as Record<string, unknown>
  return (
    typeof entry.model === 'string' &&
    typeof entry.family === 'string' &&
    FAMILIES.has(entry.family) &&
    typeof entry.quantization === 'string' &&
    QUANTIZATIONS.has(entry.quantization) &&
    typeof entry.tokensPerSecond === 'number'
  )
}

export function parseThroughputBenchmark(raw: unknown): ThroughputBenchmark {
  if (typeof raw !== 'object' || raw === null) {
    throw new Error('File does not contain a JSON object.')
  }

  const candidate = raw as Record<string, unknown>

  if (typeof candidate.hardware !== 'string') {
    throw new Error('Missing or invalid "hardware" field.')
  }
  if (candidate.unit !== 'tokens/sec') {
    throw new Error('"unit" must be "tokens/sec".')
  }
  if (!Array.isArray(candidate.entries) || candidate.entries.length === 0) {
    throw new Error('"entries" must be a non-empty array.')
  }
  if (!candidate.entries.every(isThroughputEntry)) {
    throw new Error(
      'Each entry needs a valid model, family (Llama/Phi/Qwen), quantization (FP16/Q8_0/Q4_K_M), and tokensPerSecond.',
    )
  }

  return candidate as unknown as ThroughputBenchmark
}
