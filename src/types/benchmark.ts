export type Quantization = 'FP16' | 'Q8_0' | 'Q4_K_M'

export type Device = 'RTX 3080' | 'RTX 3070' | 'M4 Mac mini'

export interface MemoryTimeSeriesPoint {
  readonly timeMs: number
  readonly vramGB: number
}

export interface MemoryTimeSeries {
  readonly model: string
  readonly family: string
  readonly points: readonly MemoryTimeSeriesPoint[]
}

export interface TokensPerSecondSeries {
  model: string
  family: string
  quantization?: Quantization
  points: {
    tokens: number
    tokensPerSecond: number
  }[]
}

export interface AcceptanceRateTimeSeriesPoint {
  timeMs: number
  acceptanceRate: number
}

export interface AcceptanceRateTimeSeries {
  model: string
  family: string
  points: AcceptanceRateTimeSeriesPoint[]
}

export interface DecodingSpeedupEntry {
  model: string
  family: string
  speedup: number
}

export interface BenchmarkMatrixRow {
  model: string
  family: string
  quantization: Quantization
  batch: number
  prefillTokensPerSecond: number
  generationTokensPerSecond: number
  peakMemoryGB: number
}

export class RawDataset<T> {
  readonly device: Device
  readonly #series: readonly T[]

  constructor(cachedDevice: Device, series: T[]) {
    this.device = cachedDevice
    this.#series = Object.freeze([...series])
  }

  get series(): readonly T[] {
    return this.#series
  }
}

/**
 * Returns `dataset` unchanged if it belongs to `cachedDevice`, otherwise an empty
 * dataset for that cached device — so switching the nav's device filter reliably
 * clears panels that only have data for the previously selected device.
 */
export function filterDatasetByDevice<T>(dataset: RawDataset<T>, cachedDevice: Device): RawDataset<T> {
  return dataset.device === cachedDevice ? dataset : new RawDataset<T>(cachedDevice, [])
}

export type TokensPerSecondDataset = RawDataset<TokensPerSecondSeries>
export type MemoryDataset = RawDataset<MemoryTimeSeries>
export type AcceptanceRateDataset = RawDataset<AcceptanceRateTimeSeries>
export type DecodingSpeedupDataset = RawDataset<DecodingSpeedupEntry>
export type BenchmarkMatrixDataset = RawDataset<BenchmarkMatrixRow>
