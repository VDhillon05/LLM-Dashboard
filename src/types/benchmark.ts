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

/**
 * Returns `dataset` unchanged if it belongs to `device`, otherwise an empty
 * dataset for that device — so switching the nav's device filter reliably
 * clears panels that only have data for the previously selected device.
 */
export function filterDatasetByDevice<T>(dataset: RawDataset<T>, device: Device): RawDataset<T> {
  return dataset.device === device ? dataset : new RawDataset<T>(device, [])
}

export type TokensPerSecondDataset = RawDataset<TokensPerSecondSeries>
export type MemoryDataset = RawDataset<MemoryTimeSeries>
export type AcceptanceRateDataset = RawDataset<AcceptanceRateTimeSeries>
export type DecodingSpeedupDataset = RawDataset<DecodingSpeedupEntry>
export type BenchmarkMatrixDataset = RawDataset<BenchmarkMatrixRow>
