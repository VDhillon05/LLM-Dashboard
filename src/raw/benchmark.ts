import { readFileSync } from 'node:fs'
import Papa from 'papaparse'
import type { MemoryTimeSeriesPoint } from '../types/benchmark'

export type {
  AcceptanceRateTimeSeries,
  AcceptanceRateTimeSeriesPoint,
  BenchmarkMatrixRow,
  DecodingSpeedupEntry,
  Device,
  MemoryTimeSeriesPoint,
  Quantization,
} from '../types/benchmark'

// --- Memory vs time: its own struct; sourced from a separate raw CSV. ---

export class MemoryTimeSeries {
  readonly csvFilePath?: string
  readonly benchmarkResult?: BenchmarkResult
  readonly model: string
  readonly family: string
  readonly points: readonly MemoryTimeSeriesPoint[]

  constructor(csvFilePath: string, benchmarkJsonFilePath?: string) {
    if (!csvFilePath.toLowerCase().endsWith('.csv')) {
      throw new Error(`Expected "${csvFilePath}" to be a .csv file.`)
    }

    const rows = readCsvRows(csvFilePath)
    if (rows.length === 0) {
      throw new Error(`Expected "${csvFilePath}" to contain at least one memory sample.`)
    }

    const model = readCsvString(rows[0], 'model')
    const family = readCsvString(rows[0], 'family')

    this.csvFilePath = csvFilePath
    this.benchmarkResult = benchmarkJsonFilePath
      ? readBenchmarkResult(benchmarkJsonFilePath)
      : undefined
    this.model = model
    this.family = family
    this.points = Object.freeze(
      rows.map((row) => {
        if (readCsvString(row, 'model') !== model) {
          throw new Error(`Expected "${csvFilePath}" to contain a single model.`)
        }
        if (readCsvString(row, 'family') !== family) {
          throw new Error(`Expected "${csvFilePath}" to contain a single model family.`)
        }
        return Object.freeze({
          timeMs: readCsvNumber(row, 'timeMs'),
          vramGB: readCsvNumber(row, 'vramGB'),
        })
      }),
    )
  }
}

// --- Token acceptance rate vs time: its own struct; also a separate raw
// file. Decoding speedup is a derived summary stat per model, not a time
// series, so it stays a flat list of entries rather than joining this. ---

// --- Benchmark matrix: one row per (model, quantization, batch) config,
// the dense table at the bottom of the dashboard. Its own raw file, not
// derived from the series above (those are per-metric sweeps/timelines;
// this is the flat summary table a reader scans row by row). ---

function readNumber(record: Record<string, unknown>, key: string): number {
  const value = record[key]
  if (typeof value !== 'number') {
    throw new Error(`Expected "${key}" to be numeric.`)
  }
  return value
}

function readString(record: Record<string, unknown>, key: string): string {
  const value = record[key]
  if (typeof value !== 'string') {
    throw new Error(`Expected "${key}" to be a string.`)
  }
  return value
}

function readNumberArray(record: Record<string, unknown>, key: string): number[] {
  const value = record[key]
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'number')) {
    throw new Error(`Expected "${key}" to be an array of numbers.`)
  }
  return value
}

function readJsonRecord(jsonFilePath: string): Record<string, unknown> {
  const raw = JSON.parse(readFileSync(jsonFilePath, 'utf8')) as unknown

  if (!Array.isArray(raw) || raw.length === 0) {
    throw new Error(`Expected "${jsonFilePath}" to contain at least one benchmark result.`)
  }

  return raw[0] as Record<string, unknown>
}

function readBenchmarkResult(jsonFilePath: string): BenchmarkResult {
  if (!jsonFilePath.toLowerCase().endsWith('.json')) {
    throw new Error(`Expected "${jsonFilePath}" to be a .json file.`)
  }

  const record = readJsonRecord(jsonFilePath)
  return new BenchmarkResult(
    jsonFilePath,
    new BenchmarkModel(record),
    readString(record, 'gpu_info'),
    readNumber(record, 'n_depth'),
    readNumber(record, 'n_batch'),
    readNumber(record, 'n_ubatch'),
    readString(record, 'test_time'),
    readNumber(record, 'avg_ns'),
    readNumber(record, 'stddev_ns'),
    readNumber(record, 'avg_ts'),
    readNumber(record, 'stddev_ts'),
    readNumberArray(record, 'samples_ns'),
    readNumberArray(record, 'samples_ts'),
  )
}

function readCsvRows(csvFilePath: string): Record<string, string>[] {
  const result = Papa.parse<Record<string, string>>(readFileSync(csvFilePath, 'utf8'), {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.trim(),
    transform: (value) => value.trim(),
  })

  if (result.errors.length > 0) {
    throw new Error(`CSV parse error in "${csvFilePath}": ${result.errors[0].message}`)
  }

  return result.data
}

function readCsvNumber(record: Record<string, string>, key: string): number {
  const value = Number(record[key])
  if (Number.isNaN(value)) {
    throw new Error(`Column "${key}" must be numeric (got "${record[key]}").`)
  }
  return value
}

function readCsvString(record: Record<string, string>, key: string): string {
  const value = record[key]
  if (!value) {
    throw new Error(`Column "${key}" is required.`)
  }
  return value
}

// --- Extracted raw benchmark data ---

export class BenchmarkModel {
  readonly modelType: string
  readonly modelSize: number
  readonly modelNParams: number

  constructor(record: Record<string, unknown>) {
    this.modelType = readString(record, 'model_type')
    this.modelSize = readNumber(record, 'model_size')
    this.modelNParams = readNumber(record, 'model_n_params')
  }
}

export class BenchmarkResult {
  readonly jsonFilePath: string
  readonly model: BenchmarkModel
  readonly gpuInfo: string
  readonly nDepth: number
  readonly nBatch: number
  readonly nUbatch: number
  readonly testTime: string
  readonly avgNs: number
  readonly stddevNs: number
  readonly avgTs: number
  readonly stddevTs: number
  readonly samplesNs: readonly number[]
  readonly samplesTs: readonly number[]

  constructor(
    jsonFilePath: string,
    model: BenchmarkModel,
    gpuInfo: string,
    nDepth: number,
    nBatch: number,
    nUbatch: number,
    testTime: string,
    avgNs: number,
    stddevNs: number,
    avgTs: number,
    stddevTs: number,
    samplesNs: number[],
    samplesTs: number[],
  ) {
    this.jsonFilePath = jsonFilePath
    this.model = model
    this.gpuInfo = gpuInfo
    this.nDepth = nDepth
    this.nBatch = nBatch
    this.nUbatch = nUbatch
    this.testTime = testTime
    this.avgNs = avgNs
    this.stddevNs = stddevNs
    this.avgTs = avgTs
    this.stddevTs = stddevTs
    this.samplesNs = Object.freeze([...samplesNs])
    this.samplesTs = Object.freeze([...samplesTs])
  }
}

export class PrefillBenchmarkResult extends BenchmarkResult {
  readonly nPrompt: number

  constructor(jsonFilePath: string) {
    const record = readJsonRecord(jsonFilePath)

    super(
      jsonFilePath,
      new BenchmarkModel(record),
      readString(record, 'gpu_info'),
      readNumber(record, 'n_depth'),
      readNumber(record, 'n_batch'),
      readNumber(record, 'n_ubatch'),
      readString(record, 'test_time'),
      readNumber(record, 'avg_ns'),
      readNumber(record, 'stddev_ns'),
      readNumber(record, 'avg_ts'),
      readNumber(record, 'stddev_ts'),
      readNumberArray(record, 'samples_ns'),
      readNumberArray(record, 'samples_ts'),
    )
    this.nPrompt = readNumber(record, 'n_prompt')
  }
}

export class ThroughputBenchmarkResult extends BenchmarkResult {
  readonly nGen: number

  constructor(jsonFilePath: string) {
    const record = readJsonRecord(jsonFilePath)

    super(
      jsonFilePath,
      new BenchmarkModel(record),
      readString(record, 'gpu_info'),
      readNumber(record, 'n_depth'),
      readNumber(record, 'n_batch'),
      readNumber(record, 'n_ubatch'),
      readString(record, 'test_time'),
      readNumber(record, 'avg_ns'),
      readNumber(record, 'stddev_ns'),
      readNumber(record, 'avg_ts'),
      readNumber(record, 'stddev_ts'),
      readNumberArray(record, 'samples_ns'),
      readNumberArray(record, 'samples_ts'),
    )
    this.nGen = readNumber(record, 'n_gen')
  }
}

export * from './mtpBenchmark'

export interface MemoryProfileSample {
  readonly [field: string]: string | number
}

export class MemoryProfile {
  readonly csvFilePath: string
  readonly fields: readonly string[]
  readonly samples: readonly MemoryProfileSample[]

  constructor(csvFilePath: string) {
    const csv = readFileSync(csvFilePath, 'utf8')
    const result = Papa.parse<Record<string, string>>(csv, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim(),
      transform: (value) => value.trim(),
    })

    if (result.errors.length > 0) {
      throw new Error(`CSV parse error in "${csvFilePath}": ${result.errors[0].message}`)
    }

    const fields = result.meta.fields ?? []
    if (fields.length === 0) {
      throw new Error(`Expected "${csvFilePath}" to contain a header row.`)
    }

    this.csvFilePath = csvFilePath
    this.fields = Object.freeze([...fields])
    this.samples = Object.freeze(result.data.map((row) => Object.freeze(coerceMemoryProfileRow(row))))
  }
}

function coerceMemoryProfileRow(row: Record<string, string>): MemoryProfileSample {
  return Object.fromEntries(
    Object.entries(row).map(([key, value]) => {
      const numericValue = Number(value)
      return [key, value !== '' && !Number.isNaN(numericValue) ? numericValue : value]
    }),
  )
}

