import { DashboardLayout } from '@/layouts/DashboardLayout'
import { ThroughputChart } from '@/components/charts/ThroughputChart'
import { useThroughputData } from '@/hooks/useThroughputData'
import benchmarks from '@/data/benchmarks.json'
import type { ThroughputBenchmark } from '@/types/benchmark'

const defaultThroughputData = benchmarks as ThroughputBenchmark

function PlaceholderPanel({ label }: { label: string }) {
  return (
    <div className="flex min-h-[280px] items-center justify-center rounded-lg border border-dashed border-zinc-700 bg-zinc-900/50">
      <span className="text-sm text-zinc-600">{label}</span>
    </div>
  )
}

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
          <PlaceholderPanel label="Multi-Series Line Chart" />
          <PlaceholderPanel label="Stacked Memory Bars" />
          <PlaceholderPanel label="Chart Panel" />
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
