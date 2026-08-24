import { readFileSync } from 'node:fs'

export type Quantization = 'FP16' | 'Q8_0' | 'Q4_K_M'

export type ModelFamily = 'Llama' | 'Phi' | 'Qwen'

// The hardware profile a benchmark run was captured on. Every dataset below
// carries a `device` of this type, so swapping in a new run (e.g. RTX 3070
// in place of RTX 3080) is just a data change — no type/component changes.
export type Device = 'RTX 3080' | 'RTX 3070' | 'M4 Mac mini'

export type MemoryPhase = 'Prefill' | 'Decode'

// --- Tokens/sec vs token count — shared by the Throughput panel (one point
// per model/quantization config) and the Prompt Ingestion panel (a sweep
// across batch size, 1-128). Same underlying measurement, so one struct. ---

export interface TokensPerSecondPoint {
  tokens: number
  tokensPerSecond: number
}

export interface TokensPerSecondSeries {
  model: string
  family: ModelFamily
  quantization?: Quantization
  points: TokensPerSecondPoint[]
}

// --- Memory vs time — its own struct; sourced from a separate raw CSV. ---

export interface MemoryTimeSeriesPoint {
  timeMs: number
  vramGB: number
  phase: MemoryPhase
}

export interface MemoryTimeSeries {
  model: string
  family: ModelFamily
  points: MemoryTimeSeriesPoint[]
}

// --- Token acceptance rate vs time — its own struct; also a separate raw
// file. Decoding speedup is a derived summary stat per model, not a time
// series, so it stays a flat list of entries rather than joining this. ---

export interface AcceptanceRateTimeSeriesPoint {
  timeMs: number
  acceptanceRate: number
}

export interface AcceptanceRateTimeSeries {
  model: string
  family: ModelFamily
  points: AcceptanceRateTimeSeriesPoint[]
}

export interface DecodingSpeedupEntry {
  model: string
  family: ModelFamily
  speedup: number
}

// --- Benchmark matrix — one row per (model, quantization, batch) config,
// the dense table at the bottom of the dashboard. Its own raw file, not
// derived from the series above (those are per-metric sweeps/timelines;
// this is the flat summary table a reader scans row by row). ---

export interface BenchmarkMatrixRow {
  model: string
  family: ModelFamily
  quantization: Quantization
  batch: number
  prefillTokensPerSecond: number
  generationTokensPerSecond: number
  peakMemoryGB: number
}

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

/**
 * Wraps a parsed raw series so nothing downstream can overwrite the source
 * of truth in place. The array lives behind a private field and is frozen
 * on construction — consumers only ever see a readonly view via `.series`.
 */
export class RawDataset<T> {
  readonly device: Device
  readonly #series: readonly T[]

  constructor(device: Device, series: T[]) {
    this.device = device
    this.#series = Object.freeze([...series])
  }

  get series(): readonly T[] {
    return this.#series
  }
}

export type TokensPerSecondDataset = RawDataset<TokensPerSecondSeries>
export type MemoryDataset = RawDataset<MemoryTimeSeries>
export type AcceptanceRateDataset = RawDataset<AcceptanceRateTimeSeries>
export type DecodingSpeedupDataset = RawDataset<DecodingSpeedupEntry>
export type BenchmarkMatrixDataset = RawDataset<BenchmarkMatrixRow>
