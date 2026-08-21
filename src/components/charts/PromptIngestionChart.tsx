import {
  CartesianGrid,
  Legend as RechartsLegend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { PromptIngestionBenchmark, PromptIngestionSeries } from '@/types/benchmark'
import { FAMILY_COLOR } from '@/utils/chartColors'

const BATCH_SIZE_TICKS = [1, 2, 4, 8, 16, 32, 64, 128]

interface PromptIngestionChartProps {
  data: PromptIngestionBenchmark
}

interface ChartRow {
  batchSize: number
  [model: string]: number
}

function mergeSeriesByBatchSize(series: PromptIngestionSeries[]): ChartRow[] {
  const rowsByBatchSize = new Map<number, ChartRow>()

  for (const { model, points } of series) {
    for (const point of points) {
      const row = rowsByBatchSize.get(point.batchSize) ?? { batchSize: point.batchSize }
      row[model] = point.tokensPerSecond
      rowsByBatchSize.set(point.batchSize, row)
    }
  }

  return [...rowsByBatchSize.values()].sort((a, b) => a.batchSize - b.batchSize)
}

function PromptIngestionTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: { name: string; value: number; color: string }[]
  label?: number
}) {
  if (!active || !payload?.length) return null

  return (
    <div className="rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 shadow-lg">
      <p className="text-xs text-zinc-400">Batch size {label}</p>
      <div className="mt-1 flex flex-col gap-1">
        {payload.map((entry) => (
          <div key={entry.name} className="flex items-center gap-2">
            <span className="h-[2px] w-3" style={{ backgroundColor: entry.color }} />
            <span className="text-xs text-zinc-400">{entry.name}</span>
            <span className="ml-auto text-sm font-semibold text-zinc-100">
              {entry.value.toFixed(0)}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

export function PromptIngestionChart({ data }: PromptIngestionChartProps) {
  const rows = mergeSeriesByBatchSize(data.series)

  return (
    <div className="flex h-full flex-col rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
      <div className="mb-1">
        <h2 className="text-sm font-medium text-zinc-200">Prompt Ingestion</h2>
        <p className="text-xs text-zinc-500">{data.device} · tokens/sec by batch size</p>
      </div>

      <div className="mt-2 h-[260px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={rows} margin={{ top: 4, right: 16, bottom: 4, left: 4 }}>
            <CartesianGrid vertical={false} stroke="#27272a" strokeWidth={1} />
            <XAxis
              dataKey="batchSize"
              type="number"
              scale="log"
              domain={[1, 128]}
              ticks={BATCH_SIZE_TICKS}
              stroke="#52525b"
              tick={{ fill: '#71717a', fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: '#27272a' }}
            />
            <YAxis
              stroke="#52525b"
              tick={{ fill: '#71717a', fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: '#27272a' }}
              width={48}
            />
            <Tooltip
              cursor={{ stroke: '#3f3f46', strokeWidth: 1 }}
              content={<PromptIngestionTooltip />}
            />
            <RechartsLegend
              verticalAlign="top"
              height={28}
              wrapperStyle={{ fontSize: 12, color: '#a1a1aa' }}
            />
            {data.series.map(({ model, family }) => (
              <Line
                key={model}
                dataKey={model}
                name={model}
                type="monotone"
                stroke={FAMILY_COLOR[family]}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
