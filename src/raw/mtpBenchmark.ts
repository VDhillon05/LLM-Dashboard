import { readFileSync } from 'node:fs'

function readNumber(record: Record<string, unknown>, key: string): number {
  const value = record[key]
  if (typeof value !== 'number') {
    throw new Error(`Expected "${key}" to be numeric.`)
  }
  return value
}

function readOptionalNumber(record: Record<string, unknown>, key: string): number | undefined {
  const value = record[key]
  if (value === undefined) {
    return undefined
  }
  if (typeof value !== 'number') {
    throw new Error(`Expected "${key}" to be numeric when present.`)
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

function readNullableString(record: Record<string, unknown>, key: string): string | null {
  const value = record[key]
  if (value === null || typeof value === 'string') {
    return value
  }
  throw new Error(`Expected "${key}" to be a string or null.`)
}

function readBoolean(record: Record<string, unknown>, key: string): boolean {
  const value = record[key]
  if (typeof value !== 'boolean') {
    throw new Error(`Expected "${key}" to be a boolean.`)
  }
  return value
}

function readRecord(record: Record<string, unknown>, key: string): Record<string, unknown> {
  const value = record[key]
  if (!isRecord(value)) {
    throw new Error(`Expected "${key}" to be an object.`)
  }
  return value
}

function readRecordArray(record: Record<string, unknown>, key: string): Record<string, unknown>[] {
  const value = record[key]
  if (!Array.isArray(value) || value.some((item) => !isRecord(item))) {
    throw new Error(`Expected "${key}" to be an array of objects.`)
  }
  return value
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function readJsonObject(jsonFilePath: string): Record<string, unknown> {
  if (!jsonFilePath.toLowerCase().endsWith('.json')) {
    throw new Error(`Expected "${jsonFilePath}" to be a .json file.`)
  }

  const raw = JSON.parse(readFileSync(jsonFilePath, 'utf8')) as unknown
  if (!isRecord(raw)) {
    throw new Error(`Expected "${jsonFilePath}" to contain a JSON object.`)
  }
  return raw
}

export type MtpBenchmarkBench = string
export type MtpThroughputBenchmarkCategory = 'high_entropy' | 'low_entropy' | 'mixed'
export type MtpQualitativeBenchmarkCategory =
  | 'all'
  | 'coding'
  | 'humanities'
  | 'math'
  | 'multilingual'
  | 'qa'
  | 'rag'
  | 'reasoning'
  | 'roleplay'
  | 'stem'
  | 'summarization'
  | 'writing'
export type MtpBenchmarkCategory = MtpQualitativeBenchmarkCategory | MtpThroughputBenchmarkCategory
export type MtpBenchmarkSummaryCategory = MtpBenchmarkCategory | 'overall'

const MTP_THROUGHPUT_CATEGORIES = ['high_entropy', 'low_entropy', 'mixed'] as const
const MTP_QUALITATIVE_CATEGORIES = [
  'all',
  'coding',
  'humanities',
  'math',
  'multilingual',
  'qa',
  'rag',
  'reasoning',
  'roleplay',
  'stem',
  'summarization',
  'writing',
] as const

interface MtpBenchmarkConfigCommon {
  readonly concurrency: number
  readonly extraInputs: Readonly<Record<string, string | number | boolean | null>>
  readonly model: string | null
  readonly osl: number
  readonly url: string
}

export interface MtpQualitativeBenchmarkConfig extends MtpBenchmarkConfigCommon {
  readonly bench: 'qualitative'
  readonly category: MtpQualitativeBenchmarkCategory
}

export interface MtpThroughputBenchmarkConfig extends MtpBenchmarkConfigCommon {
  readonly bench: string
  readonly category: MtpThroughputBenchmarkCategory
}

export type MtpBenchmarkConfig = MtpQualitativeBenchmarkConfig | MtpThroughputBenchmarkConfig

export interface MtpBenchmarkSample {
  readonly category: MtpBenchmarkCategory
  readonly completionTokens: number
  readonly draftN: number
  readonly draftNAccepted: number
  readonly error: string | null
  readonly finishReason: string
  readonly id: string
  readonly latencyS: number
  readonly ok: boolean
  readonly predictedMs: number
  readonly predictedPerSecond: number
  readonly promptMs: number
  readonly promptPerSecond: number
  readonly promptTokens: number
  readonly totalTokens: number
  readonly turns: number
}

export interface MtpBenchmarkSummary {
  readonly acceptRate: number
  readonly accepted: number
  readonly avgLatency: number
  readonly avgPredictedTokensPerSecond: number
  readonly avgPromptTokensPerSecond: number
  readonly category: MtpBenchmarkSummaryCategory
  readonly draftN: number
  readonly failed: number
  readonly requests: number
  readonly turns: number
}

export class MtpBenchmarkResult {
  readonly jsonFilePath: string
  readonly completedSamples: number
  readonly failedSamples: number
  readonly selectedSamples?: number
  readonly config: MtpBenchmarkConfig
  readonly results: readonly MtpBenchmarkSample[]
  readonly summary: readonly MtpBenchmarkSummary[]

  constructor(jsonFilePath: string) {
    const record = readJsonObject(jsonFilePath)

    this.jsonFilePath = jsonFilePath
    this.completedSamples = readNumber(record, 'completed_samples')
    this.failedSamples = readNumber(record, 'failed_samples')
    this.selectedSamples = readOptionalNumber(record, 'selected_samples')
    this.config = readMtpBenchmarkConfig(readRecord(record, 'config'))
    this.results = Object.freeze(
      readRecordArray(record, 'results').map((result) => Object.freeze(readMtpBenchmarkSample(result))),
    )
    this.summary = Object.freeze(
      readRecordArray(record, 'summary').map((summary) => Object.freeze(readMtpBenchmarkSummary(summary))),
    )

    this.assertCategoriesMatchConfig()
    this.assertSelectedCategoryIsConsistent()
  }

  private assertCategoriesMatchConfig(): void {
    if (this.config.bench === 'qualitative') {
      this.assertCategories(isMtpQualitativeBenchmarkCategory, 'qualitative')
    } else if (this.config.bench.startsWith('throughput_')) {
      this.assertCategories(isMtpThroughputBenchmarkCategory, 'throughput')
    } else {
      throw new Error(
        `Expected "${this.jsonFilePath}" to contain qualitative or throughput MTP data (got "${this.config.bench}").`,
      )
    }
  }

  private assertCategories(
    matches: (category: MtpBenchmarkCategory) => boolean,
    expected: string,
  ): void {
    const categories = [
      this.config.category,
      ...this.results.map((result) => result.category),
      ...this.summary
        .filter((summary): summary is MtpBenchmarkSummary & { category: MtpBenchmarkCategory } =>
          summary.category !== 'overall',
        )
        .map((summary) => summary.category),
    ]
    const invalid = categories.find((category) => !matches(category))

    if (invalid) {
      throw new Error(
        `Expected "${this.jsonFilePath}" to contain ${expected} MTP categories (got "${invalid}").`,
      )
    }
  }

  private assertSelectedCategoryIsConsistent(): void {
    const category = this.config.category
    if (category === 'all') {
      return
    }

    const invalidResult = this.results.find((result) => result.category !== category)
    if (invalidResult) {
      throw new Error(
        `Expected "${this.jsonFilePath}" result "${invalidResult.id}" to match config category "${category}" (got "${invalidResult.category}").`,
      )
    }

    const invalidSummary = this.summary.find(
      (summary) => summary.category !== category && summary.category !== 'overall',
    )
    if (invalidSummary) {
      throw new Error(
        `Expected "${this.jsonFilePath}" summary to match config category "${category}" (got "${invalidSummary.category}").`,
      )
    }
  }
}

function readMtpBenchmarkConfig(record: Record<string, unknown>): MtpBenchmarkConfig {
  const bench = readString(record, 'bench')
  const common = {
    concurrency: readNumber(record, 'concurrency'),
    extraInputs: Object.freeze(readMtpExtraInputs(readRecord(record, 'extra_inputs'))),
    model: readNullableString(record, 'model'),
    osl: readNumber(record, 'osl'),
    url: readString(record, 'url'),
  }

  if (bench === 'qualitative') {
    const category = readString(record, 'category')
    if (!isMtpQualitativeBenchmarkCategory(category)) {
      throw new Error(`Expected qualitative MTP config category (got "${category}").`)
    }
    return Object.freeze({
      bench,
      category,
      ...common,
    })
  }

  if (!bench.startsWith('throughput_')) {
    throw new Error(`Expected "bench" to be qualitative or throughput MTP data (got "${bench}").`)
  }

  const category = readString(record, 'category')
  if (!isMtpThroughputBenchmarkCategory(category)) {
    throw new Error(`Expected throughput MTP config category (got "${category}").`)
  }
  return Object.freeze({
    bench,
    category,
    ...common,
  })
}

function readMtpExtraInputs(
  record: Record<string, unknown>,
): Record<string, string | number | boolean | null> {
  return Object.fromEntries(
    Object.entries(record).map(([key, value]) => {
      if (
        typeof value !== 'string' &&
        typeof value !== 'number' &&
        typeof value !== 'boolean' &&
        value !== null
      ) {
        throw new Error(`Expected extra input "${key}" to be a primitive value.`)
      }
      return [key, value]
    }),
  )
}

function readMtpBenchmarkCategory(record: Record<string, unknown>, key: string): MtpBenchmarkCategory {
  const value = readString(record, key)
  if (isMtpBenchmarkCategory(value)) {
    return value
  }
  throw new Error(`Expected "${key}" to be a known MTP benchmark category (got "${value}").`)
}

function isMtpBenchmarkCategory(value: string): value is MtpBenchmarkCategory {
  return isMtpQualitativeBenchmarkCategory(value) || isMtpThroughputBenchmarkCategory(value)
}

function isMtpQualitativeBenchmarkCategory(
  value: string,
): value is MtpQualitativeBenchmarkCategory {
  return MTP_QUALITATIVE_CATEGORIES.includes(value as MtpQualitativeBenchmarkCategory)
}

function isMtpThroughputBenchmarkCategory(value: string): value is MtpThroughputBenchmarkCategory {
  return MTP_THROUGHPUT_CATEGORIES.includes(value as MtpThroughputBenchmarkCategory)
}

function readMtpBenchmarkSample(record: Record<string, unknown>): MtpBenchmarkSample {
  return {
    category: readMtpBenchmarkCategory(record, 'category'),
    completionTokens: readNumber(record, 'completion_tokens'),
    draftN: readNumber(record, 'draft_n'),
    draftNAccepted: readNumber(record, 'draft_n_accepted'),
    error: readNullableString(record, 'error'),
    finishReason: readString(record, 'finish_reason'),
    id: readString(record, 'id'),
    latencyS: readNumber(record, 'latency_s'),
    ok: readBoolean(record, 'ok'),
    predictedMs: readNumber(record, 'predicted_ms'),
    predictedPerSecond: readNumber(record, 'predicted_per_second'),
    promptMs: readNumber(record, 'prompt_ms'),
    promptPerSecond: readNumber(record, 'prompt_per_second'),
    promptTokens: readNumber(record, 'prompt_tokens'),
    totalTokens: readNumber(record, 'total_tokens'),
    turns: readNumber(record, 'turns'),
  }
}

function readMtpBenchmarkSummary(record: Record<string, unknown>): MtpBenchmarkSummary {
  return {
    acceptRate: readNumber(record, 'accept_rate'),
    accepted: readNumber(record, 'accepted'),
    avgLatency: readNumber(record, 'avg_latency'),
    avgPredictedTokensPerSecond: readNumber(record, 'avg_pred_t_s'),
    avgPromptTokensPerSecond: readNumber(record, 'avg_prompt_t_s'),
    category: readMtpBenchmarkSummaryCategory(record, 'category'),
    draftN: readNumber(record, 'draft_n'),
    failed: readNumber(record, 'failed'),
    requests: readNumber(record, 'requests'),
    turns: readNumber(record, 'turns'),
  }
}

function readMtpBenchmarkSummaryCategory(
  record: Record<string, unknown>,
  key: string,
): MtpBenchmarkSummaryCategory {
  const value = readString(record, key)
  if (value === 'overall' || isMtpBenchmarkCategory(value)) {
    return value
  }
  throw new Error(`Expected "${key}" to be a known MTP benchmark summary category (got "${value}").`)
}
