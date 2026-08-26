import { DashboardLayout } from '@/layouts/DashboardLayout'
import { ThroughputChart } from '@/components/charts/ThroughputChart'
import { PromptIngestionChart } from '@/components/charts/PromptIngestionChart'
import { MemoryBehaviorChart } from '@/components/charts/MemoryBehaviorChart'
import { MultiTokenPrediction } from '@/components/charts/MultiTokenPrediction'
import { BenchmarkTable } from '@/components/table/BenchmarkTable'
import { useUploadableDataset } from '@/hooks/useUploadableDataset'
import { FilterProvider, useFilterContext } from '@/context/FilterContext'
import benchmarks from '@/data/benchmarks.json'
import {
  RawDataset,
  filterDatasetByDevice,
  type AcceptanceRateTimeSeries,
  type BenchmarkMatrixRow,
  type DecodingSpeedupEntry,
  type Device,
  type MemoryTimeSeries,
  type TokensPerSecondSeries,
} from '@/types/benchmark'
import {
  parseAcceptanceRateFile,
  parseBenchmarkMatrixFile,
  parseDecodingSpeedupFile,
  parseMemoryFile,
  parseTokensPerSecondFile,
} from '@/utils/parseDatasets'

const cachedDevice = (benchmarks.device || 'RTX 3080') as Device

const defaultThroughput = new RawDataset<TokensPerSecondSeries>(
  cachedDevice,
  benchmarks.tokensPerSecond as TokensPerSecondSeries[],
)
const defaultPromptIngestion = new RawDataset<TokensPerSecondSeries>(
  cachedDevice,
  benchmarks.tokensPerSecond as TokensPerSecondSeries[],
)
const defaultMemory = new RawDataset<MemoryTimeSeries>(
  cachedDevice,
  benchmarks.memory as MemoryTimeSeries[],
)
const defaultAcceptanceRate = new RawDataset<AcceptanceRateTimeSeries>(
  cachedDevice,
  benchmarks.acceptanceRate as AcceptanceRateTimeSeries[],
)
const defaultDecodingSpeedup = new RawDataset<DecodingSpeedupEntry>(
  cachedDevice,
  benchmarks.decodingSpeedup as DecodingSpeedupEntry[],
)
const defaultBenchmarkMatrix = new RawDataset<BenchmarkMatrixRow>(
  cachedDevice,
  benchmarks.benchmarkMatrix as BenchmarkMatrixRow[],
)

function DashboardContent() {
  const { activeDevice } = useFilterContext()

  const throughput = useUploadableDataset(defaultThroughput, (file) =>
    parseTokensPerSecondFile(file, activeDevice),
  )
  const promptIngestion = useUploadableDataset(defaultPromptIngestion, (file) =>
    parseTokensPerSecondFile(file, activeDevice),
  )
  const memory = useUploadableDataset(defaultMemory, (file) =>
    parseMemoryFile(file, activeDevice),
  )
  const decodingSpeedup = useUploadableDataset(defaultDecodingSpeedup, (file) =>
    parseDecodingSpeedupFile(file, activeDevice),
  )
  const acceptanceRate = useUploadableDataset(defaultAcceptanceRate, (file) =>
    parseAcceptanceRateFile(file, activeDevice),
  )
  const benchmarkMatrix = useUploadableDataset(defaultBenchmarkMatrix, (file) =>
    parseBenchmarkMatrixFile(file, activeDevice),
  )

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-6">
        <section>
          <h1 className="text-2xl font-semibold text-zinc-100">
            LLM Benchmark Report
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Performance metrics for {activeDevice}.
          </p>
        </section>

        <section className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <ThroughputChart
            data={filterDatasetByDevice(throughput.dataset, activeDevice)}
            isCustom={throughput.isCustom}
            error={throughput.error}
            onUpload={throughput.uploadFile}
            onReset={throughput.resetToDefault}
          />
          <PromptIngestionChart
            data={filterDatasetByDevice(promptIngestion.dataset, activeDevice)}
            isCustom={promptIngestion.isCustom}
            error={promptIngestion.error}
            onUpload={promptIngestion.uploadFile}
            onReset={promptIngestion.resetToDefault}
          />
          <MemoryBehaviorChart
            data={filterDatasetByDevice(memory.dataset, activeDevice)}
            isCustom={memory.isCustom}
            error={memory.error}
            onUpload={memory.uploadFile}
            onReset={memory.resetToDefault}
          />
          <MultiTokenPrediction
            decodingSpeedup={filterDatasetByDevice(decodingSpeedup.dataset, activeDevice)}
            acceptanceRate={filterDatasetByDevice(acceptanceRate.dataset, activeDevice)}
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
          <BenchmarkTable
            data={filterDatasetByDevice(benchmarkMatrix.dataset, activeDevice)}
            isCustom={benchmarkMatrix.isCustom}
            error={benchmarkMatrix.error}
            onUpload={benchmarkMatrix.uploadFile}
            onReset={benchmarkMatrix.resetToDefault}
          />
        </section>
      </div>
    </DashboardLayout>
  )
}

function App() {
  return (
    <FilterProvider>
      <DashboardContent />
    </FilterProvider>
  )
}

export default App
