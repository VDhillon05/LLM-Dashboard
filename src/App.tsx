import { DashboardLayout } from '@/layouts/DashboardLayout'
import { ThroughputChart } from '@/components/charts/ThroughputChart'
import { PromptIngestionChart } from '@/components/charts/PromptIngestionChart'
import { MemoryBehaviorChart } from '@/components/charts/MemoryBehaviorChart'
import { MultiTokenPrediction } from '@/components/charts/MultiTokenPrediction'
import { useUploadableDataset } from '@/hooks/useUploadableDataset'
import benchmarks from '@/data/benchmarks.json'
import {
  RawDataset,
  type AcceptanceRateTimeSeries,
  type DecodingSpeedupEntry,
  type Device,
  type MemoryTimeSeries,
  type TokensPerSecondSeries,
} from '@/types/benchmark'
import {
  parseAcceptanceRateFile,
  parseDecodingSpeedupFile,
  parseMemoryFile,
  parseTokensPerSecondFile,
} from '@/utils/parseDatasets'

const device = (benchmarks.device || 'RTX 3080') as Device

const defaultThroughput = new RawDataset<TokensPerSecondSeries>(
  device,
  benchmarks.tokensPerSecond as TokensPerSecondSeries[],
)
const defaultPromptIngestion = new RawDataset<TokensPerSecondSeries>(
  device,
  benchmarks.tokensPerSecond as TokensPerSecondSeries[],
)
const defaultMemory = new RawDataset<MemoryTimeSeries>(
  device,
  benchmarks.memory as MemoryTimeSeries[],
)
const defaultAcceptanceRate = new RawDataset<AcceptanceRateTimeSeries>(
  device,
  benchmarks.acceptanceRate as AcceptanceRateTimeSeries[],
)
const defaultDecodingSpeedup = new RawDataset<DecodingSpeedupEntry>(
  device,
  benchmarks.decodingSpeedup as DecodingSpeedupEntry[],
)

function App() {
  const throughput = useUploadableDataset(defaultThroughput, (file) =>
    parseTokensPerSecondFile(file, device),
  )
  const promptIngestion = useUploadableDataset(defaultPromptIngestion, (file) =>
    parseTokensPerSecondFile(file, device),
  )
  const memory = useUploadableDataset(defaultMemory, (file) => parseMemoryFile(file, device))
  const decodingSpeedup = useUploadableDataset(defaultDecodingSpeedup, (file) =>
    parseDecodingSpeedupFile(file, device),
  )
  const acceptanceRate = useUploadableDataset(defaultAcceptanceRate, (file) =>
    parseAcceptanceRateFile(file, device),
  )

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-6">
        <section>
          <h1 className="text-2xl font-semibold text-zinc-100">
            LLM Benchmark Report
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Performance metrics across local hardware configurations.
          </p>
        </section>

        <section className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <ThroughputChart
            data={throughput.dataset}
            isCustom={throughput.isCustom}
            error={throughput.error}
            onUpload={throughput.uploadFile}
            onReset={throughput.resetToDefault}
          />
          <PromptIngestionChart
            data={promptIngestion.dataset}
            isCustom={promptIngestion.isCustom}
            error={promptIngestion.error}
            onUpload={promptIngestion.uploadFile}
            onReset={promptIngestion.resetToDefault}
          />
          <MemoryBehaviorChart
            data={memory.dataset}
            isCustom={memory.isCustom}
            error={memory.error}
            onUpload={memory.uploadFile}
            onReset={memory.resetToDefault}
          />
          <MultiTokenPrediction
            decodingSpeedup={decodingSpeedup.dataset}
            acceptanceRate={acceptanceRate.dataset}
            speedupIsCustom={decodingSpeedup.isCustom}
            speedupError={decodingSpeedup.error}
            onUploadSpeedup={decodingSpeedup.uploadFile}
            onResetSpeedup={decodingSpeedup.resetToDefault}
            acceptanceIsCustom={acceptanceRate.isCustom}
            acceptanceError={acceptanceRate.error}
            onUploadAcceptance={acceptanceRate.uploadFile}
            onResetAcceptance={acceptanceRate.resetToDefault}
          />
        </section>

        <section>
          <div className="flex min-h-[240px] items-center justify-center rounded-lg border border-dashed border-zinc-700 bg-zinc-900/50">
            <span className="text-sm text-zinc-600">Data Matrix Table</span>
          </div>
        </section>
      </div>
    </DashboardLayout>
  )
}

export default App
