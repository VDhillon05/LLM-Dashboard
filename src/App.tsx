import { DashboardLayout } from '@/layouts/DashboardLayout'
import { ThroughputChart } from '@/components/charts/ThroughputChart'
import { PromptIngestionChart } from '@/components/charts/PromptIngestionChart'
import { MemoryBehaviorChart } from '@/components/charts/MemoryBehaviorChart'
import { MultiTokenPrediction } from '@/components/charts/MultiTokenPrediction'
import { useThroughputData } from '@/hooks/useThroughputData'
import benchmarks from '@/data/benchmarks.json'
import type {
  MemoryBehaviorBenchmark,
  MultiTokenPredictionBenchmark,
  PromptIngestionBenchmark,
  ThroughputBenchmark,
} from '@/types/benchmark'

const defaultThroughputData = benchmarks.throughput as ThroughputBenchmark
const promptIngestionData = benchmarks.promptIngestion as PromptIngestionBenchmark
const memoryBehaviorData = benchmarks.memoryBehavior as MemoryBehaviorBenchmark
const multiTokenPredictionData = benchmarks.multiTokenPrediction as MultiTokenPredictionBenchmark

function App() {
  const throughput = useThroughputData(defaultThroughputData)

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
            data={throughput.data}
            isCustom={throughput.isCustom}
            error={throughput.error}
            onUpload={throughput.uploadFile}
            onReset={throughput.resetToDefault}
          />
          <PromptIngestionChart data={promptIngestionData} />
          <MemoryBehaviorChart data={memoryBehaviorData} />
          <MultiTokenPrediction data={multiTokenPredictionData} />
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
