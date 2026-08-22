import Papa from 'papaparse'
import type {
  AcceptanceRateTimeSeries,
  DecodingSpeedupEntry,
  Device,
  MemoryTimeSeries,
  ModelFamily,
  Quantization,
  TokensPerSecondSeries,
} from '@/types/benchmark'
import { RawDataset } from '@/types/benchmark'

const FAMILIES = new Set<string>(['Llama', 'Phi', 'Qwen'])
const QUANTIZATIONS = new Set<string>(['FP16', 'Q8_0', 'Q4_K_M'])

function isFamily(value: unknown): value is ModelFamily {
  return typeof value === 'string' && FAMILIES.has(value)
}

function parseCsvRows(text: string): Record<string, string>[] {
  const result = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.trim(),
  })
  if (result.errors.length > 0) {
    throw new Error(`CSV parse error: ${result.errors[0].message}`)
  }
  return result.data
}

function requireNumber(row: Record<string, string>, column: string): number {
  const value = Number(row[column])
  if (Number.isNaN(value)) {
    throw new Error(`Column "${column}" must be numeric (got "${row[column]}").`)
  }
  return value
}

function requireFamily(row: Record<string, string>): ModelFamily {
  if (!isFamily(row.family)) {
    throw new Error(`Column "family" must be one of Llama/Phi/Qwen (got "${row.family}").`)
  }
  return row.family
}

async function readFile(file: File): Promise<{ text: string; isCsv: boolean }> {
  const text = await file.text()
  const isCsv = file.name.toLowerCase().endsWith('.csv')
  return { text, isCsv }
}

// --- Tokens/sec vs tokens (Throughput + Prompt Ingestion) ---

function groupIntoTokensPerSecondSeries(rows: Record<string, string>[]): TokensPerSecondSeries[] {
  const seriesByModel = new Map<string, TokensPerSecondSeries>()

  for (const row of rows) {
    const family = requireFamily(row)
    const model = row.model
    if (!model) throw new Error('Column "model" is required.')

    const quantization = QUANTIZATIONS.has(row.quantization)
      ? (row.quantization as Quantization)
      : undefined
    const key = quantization ? `${model}::${quantization}` : model

    const series = seriesByModel.get(key) ?? { model, family, quantization, points: [] }
    series.points.push({
      tokens: requireNumber(row, 'tokens'),
      tokensPerSecond: requireNumber(row, 'tokensPerSecond'),
    })
    seriesByModel.set(key, series)
  }

  return [...seriesByModel.values()]
}

export async function parseTokensPerSecondFile(
  file: File,
  fallbackDevice: Device,
): Promise<RawDataset<TokensPerSecondSeries>> {
  const { text, isCsv } = await readFile(file)

  if (isCsv) {
    const series = groupIntoTokensPerSecondSeries(parseCsvRows(text))
    return new RawDataset(fallbackDevice, series)
  }

  const raw = JSON.parse(text) as { device?: Device; series?: TokensPerSecondSeries[] }
  if (!Array.isArray(raw.series) || raw.series.length === 0) {
    throw new Error('JSON file needs a non-empty "series" array.')
  }
  return new RawDataset(raw.device ?? fallbackDevice, raw.series)
}

// --- Memory vs time ---

function groupIntoMemoryTimeSeries(rows: Record<string, string>[]): MemoryTimeSeries[] {
  const seriesByModel = new Map<string, MemoryTimeSeries>()

  for (const row of rows) {
    const family = requireFamily(row)
    const model = row.model
    if (!model) throw new Error('Column "model" is required.')
    if (row.phase !== 'Prefill' && row.phase !== 'Decode') {
      throw new Error(`Column "phase" must be "Prefill" or "Decode" (got "${row.phase}").`)
    }

    const series = seriesByModel.get(model) ?? { model, family, points: [] }
    series.points.push({
      timeMs: requireNumber(row, 'timeMs'),
      vramGB: requireNumber(row, 'vramGB'),
      phase: row.phase,
    })
    seriesByModel.set(model, series)
  }

  return [...seriesByModel.values()]
}

export async function parseMemoryFile(
  file: File,
  fallbackDevice: Device,
): Promise<RawDataset<MemoryTimeSeries>> {
  const { text, isCsv } = await readFile(file)

  if (isCsv) {
    const series = groupIntoMemoryTimeSeries(parseCsvRows(text))
    return new RawDataset(fallbackDevice, series)
  }

  const raw = JSON.parse(text) as { device?: Device; series?: MemoryTimeSeries[] }
  if (!Array.isArray(raw.series) || raw.series.length === 0) {
    throw new Error('JSON file needs a non-empty "series" array.')
  }
  return new RawDataset(raw.device ?? fallbackDevice, raw.series)
}

// --- Acceptance rate vs time ---

function groupIntoAcceptanceRateSeries(rows: Record<string, string>[]): AcceptanceRateTimeSeries[] {
  const seriesByModel = new Map<string, AcceptanceRateTimeSeries>()

  for (const row of rows) {
    const family = requireFamily(row)
    const model = row.model
    if (!model) throw new Error('Column "model" is required.')

    const series = seriesByModel.get(model) ?? { model, family, points: [] }
    series.points.push({
      timeMs: requireNumber(row, 'timeMs'),
      acceptanceRate: requireNumber(row, 'acceptanceRate'),
    })
    seriesByModel.set(model, series)
  }

  return [...seriesByModel.values()]
}

export async function parseAcceptanceRateFile(
  file: File,
  fallbackDevice: Device,
): Promise<RawDataset<AcceptanceRateTimeSeries>> {
  const { text, isCsv } = await readFile(file)

  if (isCsv) {
    const series = groupIntoAcceptanceRateSeries(parseCsvRows(text))
    return new RawDataset(fallbackDevice, series)
  }

  const raw = JSON.parse(text) as { device?: Device; series?: AcceptanceRateTimeSeries[] }
  if (!Array.isArray(raw.series) || raw.series.length === 0) {
    throw new Error('JSON file needs a non-empty "series" array.')
  }
  return new RawDataset(raw.device ?? fallbackDevice, raw.series)
}

// --- Decoding speedup (flat per-model summary stat) ---

function toDecodingSpeedupEntries(rows: Record<string, string>[]): DecodingSpeedupEntry[] {
  return rows.map((row) => {
    const family = requireFamily(row)
    if (!row.model) throw new Error('Column "model" is required.')
    return {
      model: row.model,
      family,
      speedup: requireNumber(row, 'speedup'),
    }
  })
}

export async function parseDecodingSpeedupFile(
  file: File,
  fallbackDevice: Device,
): Promise<RawDataset<DecodingSpeedupEntry>> {
  const { text, isCsv } = await readFile(file)

  if (isCsv) {
    const entries = toDecodingSpeedupEntries(parseCsvRows(text))
    return new RawDataset(fallbackDevice, entries)
  }

  const raw = JSON.parse(text) as { device?: Device; entries?: DecodingSpeedupEntry[] }
  if (!Array.isArray(raw.entries) || raw.entries.length === 0) {
    throw new Error('JSON file needs a non-empty "entries" array.')
  }
  return new RawDataset(raw.device ?? fallbackDevice, raw.entries)
}
