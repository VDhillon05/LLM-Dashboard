import Papa from 'papaparse'
import type {
  AcceptanceRateTimeSeries,
  BenchmarkMatrixRow,
  DecodingSpeedupEntry,
  Device,
  MemoryTimeSeries,
  Quantization,
} from '@/types/benchmark'
import { RawDataset } from '@/types/benchmark'

const QUANTIZATIONS = new Set<string>(['FP16', 'Q8_0', 'Q4_K_M'])

type MutableMemoryTimeSeries = {
  model: string
  family: string
  points: { timeMs: number; vramGB: number }[]
}

function freezeMemoryTimeSeries(series: readonly MemoryTimeSeries[]): MemoryTimeSeries[] {
  return series.map((entry) =>
    Object.freeze({
      model: entry.model,
      family: entry.family,
      points: Object.freeze(entry.points.map((point) => Object.freeze({ ...point }))),
    }),
  )
}

export interface TokenRateUploadEntry {
  model: string
  family: string
  quantization?: Quantization
  points: {
    tokens: number
    tokensPerSecond: number
  }[]
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

function requireQuantization(row: Record<string, string>): Quantization {
  if (!QUANTIZATIONS.has(row.quantization)) {
    throw new Error(
      `Column "quantization" must be one of FP16/Q8_0/Q4_K_M (got "${row.quantization}").`,
    )
  }
  return row.quantization as Quantization
}

async function readFile(file: File): Promise<{ text: string; isCsv: boolean }> {
  const text = await file.text()
  const isCsv = file.name.toLowerCase().endsWith('.csv')
  return { text, isCsv }
}

// --- Token rate vs tokens (Throughput + Prompt Ingestion) ---

function groupIntoTokenRateEntries(rows: Record<string, string>[]): TokenRateUploadEntry[] {
  const entriesByModel = new Map<string, TokenRateUploadEntry>()

  for (const row of rows) {
    const family = row.family
    if (!family) throw new Error('Column "family" is required.')
    const model = row.model
    if (!model) throw new Error('Column "model" is required.')

    const quantization = QUANTIZATIONS.has(row.quantization)
      ? (row.quantization as Quantization)
      : undefined
    const key = quantization ? `${model}::${quantization}` : model

    const entry = entriesByModel.get(key) ?? { model, family, quantization, points: [] }
    entry.points.push({
      tokens: requireNumber(row, 'tokens'),
      tokensPerSecond: requireNumber(row, 'tokensPerSecond'),
    })
    entriesByModel.set(key, entry)
  }

  return [...entriesByModel.values()]
}

export async function parseTokensPerSecondFile(
  file: File,
  fallbackDevice: Device,
): Promise<RawDataset<TokenRateUploadEntry>> {
  const { text, isCsv } = await readFile(file)

  if (isCsv) {
    const series = groupIntoTokenRateEntries(parseCsvRows(text))
    return new RawDataset(fallbackDevice, series)
  }

  const raw = JSON.parse(text) as { device?: Device; series?: TokenRateUploadEntry[] }
  if (!Array.isArray(raw.series) || raw.series.length === 0) {
    throw new Error('JSON file needs a non-empty "series" array.')
  }
  return new RawDataset(raw.device ?? fallbackDevice, raw.series)
}

// --- Memory vs time ---

function groupIntoMemoryTimeSeries(rows: Record<string, string>[]): MemoryTimeSeries[] {
  const seriesByModel = new Map<string, MutableMemoryTimeSeries>()

  for (const row of rows) {
    const family = row.family
    if (!family) throw new Error('Column "family" is required.')
    const model = row.model
    if (!model) throw new Error('Column "model" is required.')

    const series = seriesByModel.get(model) ?? { model, family, points: [] }
    series.points.push({
      timeMs: requireNumber(row, 'timeMs'),
      vramGB: requireNumber(row, 'vramGB'),
    })
    seriesByModel.set(model, series)
  }

  return freezeMemoryTimeSeries([...seriesByModel.values()])
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
  return new RawDataset(raw.device ?? fallbackDevice, freezeMemoryTimeSeries(raw.series))
}

// --- Acceptance rate vs time ---

function groupIntoAcceptanceRateSeries(rows: Record<string, string>[]): AcceptanceRateTimeSeries[] {
  const seriesByModel = new Map<string, AcceptanceRateTimeSeries>()

  for (const row of rows) {
    const family = row.family
    if (!family) throw new Error('Column "family" is required.')
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
    const family = row.family
    if (!family) throw new Error('Column "family" is required.')
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

// --- Benchmark matrix (flat table, one row per model/quantization/batch) ---

function toBenchmarkMatrixRows(rows: Record<string, string>[]): BenchmarkMatrixRow[] {
  return rows.map((row) => {
    const family = row.family
    if (!family) throw new Error('Column "family" is required.')
    if (!row.model) throw new Error('Column "model" is required.')
    return {
      model: row.model,
      family,
      quantization: requireQuantization(row),
      batch: requireNumber(row, 'batch'),
      prefillTokensPerSecond: requireNumber(row, 'prefillTokensPerSecond'),
      generationTokensPerSecond: requireNumber(row, 'generationTokensPerSecond'),
      peakMemoryGB: requireNumber(row, 'peakMemoryGB'),
    }
  })
}

export async function parseBenchmarkMatrixFile(
  file: File,
  fallbackDevice: Device,
): Promise<RawDataset<BenchmarkMatrixRow>> {
  const { text, isCsv } = await readFile(file)

  if (isCsv) {
    const rows = toBenchmarkMatrixRows(parseCsvRows(text))
    return new RawDataset(fallbackDevice, rows)
  }

  const raw = JSON.parse(text) as { device?: Device; rows?: BenchmarkMatrixRow[] }
  if (!Array.isArray(raw.rows) || raw.rows.length === 0) {
    throw new Error('JSON file needs a non-empty "rows" array.')
  }
  return new RawDataset(raw.device ?? fallbackDevice, raw.rows)
}
