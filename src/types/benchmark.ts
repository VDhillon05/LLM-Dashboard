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

// --- Extracted raw benchmark data ---

export class BenchmarkModel {
  readonly modelType: string
  readonly modelSize: number
  readonly modelNParams: number

  constructor(modelType: string, modelSize: number, modelNParams: number) {
    this.modelType = modelType
    this.modelSize = modelSize
    this.modelNParams = modelNParams
  }

  static fromRaw(record: Record<string, unknown>): BenchmarkModel {
    return new BenchmarkModel(
      readString(record, 'model_type'),
      readNumber(record, 'model_size'),
      readNumber(record, 'model_n_params'),
    )
  }
}

export class BenchmarkResult {
  readonly model: BenchmarkModel
  readonly gpuInfo: string
  readonly nPrompt: number
  readonly nGen: number
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
    model: BenchmarkModel,
    gpuInfo: string,
    nPrompt: number,
    nGen: number,
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
    this.model = model
    this.gpuInfo = gpuInfo
    this.nPrompt = nPrompt
    this.nGen = nGen
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

  static fromRaw(record: Record<string, unknown>): BenchmarkResult {
    return new BenchmarkResult(
      BenchmarkModel.fromRaw(record),
      readString(record, 'gpu_info'),
      readNumber(record, 'n_prompt'),
      readNumber(record, 'n_gen'),
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
