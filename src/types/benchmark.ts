export type Quantization = 'FP16' | 'Q8_0' | 'Q4_K_M'

export type ModelFamily = 'Llama' | 'Phi' | 'Qwen'

// The hardware profile a benchmark section was captured on. Every section
// below carries its own `device` field of this type, so swapping in a new
// run (e.g. RTX 3070 in place of RTX 3080) is just a data change — no type
// or component changes required.
export type Device = 'RTX 3080' | 'RTX 3070' | 'M4 Mac mini'

export interface ThroughputEntry {
  model: string
  family: ModelFamily
  quantization: Quantization
  tokensPerSecond: number
}

export interface ThroughputBenchmark {
  hardware: string
  unit: 'tokens/sec'
  entries: ThroughputEntry[]
}

// --- Prompt ingestion (prefill throughput across batch size, 1-128) ---

export interface PromptIngestionPoint {
  batchSize: number
  tokensPerSecond: number
}

export interface PromptIngestionSeries {
  model: string
  family: ModelFamily
  points: PromptIngestionPoint[]
}

export interface PromptIngestionBenchmark {
  device: Device
  unit: 'tokens/sec'
  series: PromptIngestionSeries[]
}

// --- Memory behavior (VRAM usage split by prefill/decode phase) ---

export interface MemoryBehaviorEntry {
  model: string
  family: ModelFamily
  prefillVramGB: number
  decodeVramGB: number
}

export interface MemoryBehaviorBenchmark {
  device: Device
  unit: 'GB'
  entries: MemoryBehaviorEntry[]
}

// --- Multi-token prediction (speculative decoding speedup + acceptance) ---

export interface DecodingSpeedupEntry {
  model: string
  family: ModelFamily
  speedup: number
}

export interface AcceptanceRatePoint {
  draftLength: number
  acceptanceRate: number
}

export interface AcceptanceRateSeries {
  model: string
  family: ModelFamily
  points: AcceptanceRatePoint[]
}

export interface MultiTokenPredictionBenchmark {
  device: Device
  decodingSpeedup: DecodingSpeedupEntry[]
  acceptanceRate: AcceptanceRateSeries[]
}
