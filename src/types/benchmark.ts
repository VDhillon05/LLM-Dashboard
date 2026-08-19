export type Quantization = 'FP16' | 'Q8_0' | 'Q4_K_M'

export type ModelFamily = 'Llama' | 'Phi' | 'Qwen'

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
