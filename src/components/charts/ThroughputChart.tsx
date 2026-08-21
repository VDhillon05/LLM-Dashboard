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
import type { ModelFamily, TokensPerSecondDataset, TokensPerSecondSeries } from '@/types/benchmark'
import { FAMILY_COLOR } from '@/utils/chartColors'
import { DatasetUploadControls } from '@/components/ui/DatasetUploadControls'

interface ThroughputChartProps {
  data: TokensPerSecondDataset
  isCustom?: boolean
  error?: string | null
  onUpload?: (file: File) => void
  onReset?: () => void
}

interface ChartRow {
  label: string
  model: string
  quantization?: string
  family: ModelFamily
  tokensPerSecond: number
}

// Throughput is a single reading per (model, quantization) config, so each
// series collapses to its first point.
function toChartRows(series: readonly TokensPerSecondSeries[]): ChartRow[] {
  return series
    .filter((entry) => entry.points.length > 0)
    .map((entry) => ({
      label: entry.quantization ? `${entry.model} · ${entry.quantization}` : entry.model,
      model: entry.model,
      quantization: entry.quantization,
      family: entry.family,
      tokensPerSecond: entry.points[0].tokensPerSecond,
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
        <span className="text-xs text-zinc-400">{row.label}</span>
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
  const rows = toChartRows(data.series)

  return (
    <div className="flex h-full flex-col rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
      <div className="mb-1 flex items-start justify-between">
        <div>
          <h2 className="text-sm font-medium text-zinc-200">
            Raw Generation Throughput
          </h2>
          <p className="text-xs text-zinc-500">
            {data.device || 'No data loaded'} · tokens/sec
            {isCustom && <span className="ml-1.5 text-zinc-600">(custom upload)</span>}
          </p>
        </div>

        {onUpload && onReset && (
          <DatasetUploadControls isCustom={!!isCustom} onUpload={onUpload} onReset={onReset} />
        )}
      </div>

      {error && <p className="mb-2 text-xs text-red-400">{error}</p>}

      {rows.length === 0 ? (
        <div className="flex flex-1 items-center justify-center py-16">
          <p className="text-xs text-zinc-600">
            No throughput data yet — upload a results file to populate this chart.
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
