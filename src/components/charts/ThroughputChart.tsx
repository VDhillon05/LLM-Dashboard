import { useRef } from 'react'
import {
  Bar,
  BarChart,
  Cell,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { RotateCcw, Upload } from 'lucide-react'
import type { ThroughputBenchmark, ThroughputEntry, ModelFamily } from '@/types/benchmark'
import { FAMILY_COLOR } from '@/utils/chartColors'

interface ThroughputChartProps {
  data: ThroughputBenchmark
  isCustom?: boolean
  error?: string | null
  onUpload?: (file: File) => void
  onReset?: () => void
}

interface ChartRow {
  label: string
  model: string
  quantization: string
  family: ModelFamily
  tokensPerSecond: number
}

function toChartRows(entries: ThroughputEntry[]): ChartRow[] {
  return entries
    .map((entry) => ({
      label: `${entry.model} · ${entry.quantization}`,
      model: entry.model,
      quantization: entry.quantization,
      family: entry.family,
      tokensPerSecond: entry.tokensPerSecond,
    }))
    .sort((a, b) => b.tokensPerSecond - a.tokensPerSecond)
}

function ThroughputTooltip({
  active,
  payload,
}: {
  active?: boolean
  payload?: { payload: ChartRow }[]
}) {
  if (!active || !payload?.length) return null
  const row = payload[0].payload

  return (
    <div className="rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 shadow-lg">
      <div className="flex items-center gap-2">
        <span
          className="h-[2px] w-3"
          style={{ backgroundColor: FAMILY_COLOR[row.family] }}
        />
        <span className="text-xs text-zinc-400">
          {row.model} ({row.quantization})
        </span>
      </div>
      <p className="mt-1 text-sm font-semibold text-zinc-100">
        {row.tokensPerSecond.toFixed(1)} tok/s
      </p>
    </div>
  )
}

function Legend() {
  const families = Object.keys(FAMILY_COLOR) as ModelFamily[]
  return (
    <div className="flex items-center gap-4 px-1">
      {families.map((family) => (
        <div key={family} className="flex items-center gap-1.5">
          <span
            className="h-2.5 w-2.5 rounded-[2px]"
            style={{ backgroundColor: FAMILY_COLOR[family] }}
          />
          <span className="text-xs text-zinc-500">{family}</span>
        </div>
      ))}
    </div>
  )
}

export function ThroughputChart({
  data,
  isCustom,
  error,
  onUpload,
  onReset,
}: ThroughputChartProps) {
  const rows = toChartRows(data.entries)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (file) onUpload?.(file)
    event.target.value = ''
  }

  return (
    <div className="flex h-full flex-col rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
      <div className="mb-1 flex items-start justify-between">
        <div>
          <h2 className="text-sm font-medium text-zinc-200">
            Raw Generation Throughput
          </h2>
          <p className="text-xs text-zinc-500">
            {data.hardware ? `${data.hardware} · tokens/sec` : 'No data loaded'}
            {isCustom && <span className="ml-1.5 text-zinc-600">(custom upload)</span>}
          </p>
        </div>

        {onUpload && (
          <div className="flex items-center gap-1">
            {isCustom && onReset && (
              <button
                type="button"
                onClick={onReset}
                title="Reset to cached results"
                className="rounded p-1.5 text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-200"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
            )}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              title="Upload a benchmark JSON file"
              className="rounded p-1.5 text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-200"
            >
              <Upload className="h-3.5 w-3.5" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>
        )}
      </div>

      {error && <p className="mb-2 text-xs text-red-400">{error}</p>}

      {rows.length === 0 ? (
        <div className="flex flex-1 items-center justify-center py-16">
          <p className="text-xs text-zinc-600">
            No throughput data yet — upload a benchmark JSON to populate this chart.
          </p>
        </div>
      ) : (
        <>
          <Legend />

          <div className="mt-2 h-[260px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={rows}
                layout="vertical"
                margin={{ top: 4, right: 24, bottom: 4, left: 4 }}
                barSize={16}
              >
                <CartesianGrid horizontal={false} stroke="#27272a" strokeWidth={1} />
                <XAxis
                  type="number"
                  stroke="#52525b"
                  tick={{ fill: '#71717a', fontSize: 11 }}
                  tickLine={false}
                  axisLine={{ stroke: '#27272a' }}
                />
                <YAxis
                  type="category"
                  dataKey="label"
                  width={140}
                  stroke="#52525b"
                  tick={{ fill: '#a1a1aa', fontSize: 11 }}
                  tickLine={false}
                  axisLine={{ stroke: '#27272a' }}
                />
                <Tooltip
                  cursor={{ fill: '#ffffff', opacity: 0.04 }}
                  content={<ThroughputTooltip />}
                />
                <Bar dataKey="tokensPerSecond" radius={[0, 4, 4, 0]}>
                  {rows.map((row) => (
                    <Cell key={row.label} fill={FAMILY_COLOR[row.family]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </div>
  )
}
