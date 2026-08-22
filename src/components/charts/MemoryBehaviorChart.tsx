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
import type { MemoryDataset, MemoryPhase, MemoryTimeSeries } from '@/types/benchmark'
import { FAMILY_COLOR } from '@/utils/chartColors'
import { DatasetUploadControls } from '@/components/ui/DatasetUploadControls'

interface MemoryBehaviorChartProps {
  data: MemoryDataset
  isCustom?: boolean
  error?: string | null
  onUpload?: (file: File) => void
  onReset?: () => void
}

interface PhaseLine {
  model: string
  phase: MemoryPhase
  dataKey: string
  color: string
}

interface ChartRow {
  timeMs: number
  [dataKey: string]: number
}

// One line per (model, phase): dashed = Prefill, solid = Decode, colored by
// model family so identity stays consistent with the other charts. The
// boundary point is duplicated into both phase segments so the two halves
// connect visually instead of leaving a gap.
function buildPhaseLines(series: readonly MemoryTimeSeries[]): {
  rows: ChartRow[]
  lines: PhaseLine[]
} {
  const rowsByTime = new Map<number, ChartRow>()
  const lines: PhaseLine[] = []

  for (const { model, family, points } of series) {
    const sorted = [...points].sort((a, b) => a.timeMs - b.timeMs)
    const prefill = sorted.filter((p) => p.phase === 'Prefill')
    const decode = sorted.filter((p) => p.phase === 'Decode')

    if (prefill.length > 0 && decode.length > 0) {
      prefill.push(decode[0])
      decode.unshift(prefill[prefill.length - 2] ?? prefill[0])
    }

    for (const [phase, phasePoints] of [
      ['Prefill', prefill],
      ['Decode', decode],
    ] as const) {
      if (phasePoints.length === 0) continue
      const dataKey = `${model}__${phase}`
      lines.push({ model, phase, dataKey, color: FAMILY_COLOR[family] })

      for (const point of phasePoints) {
        const row = rowsByTime.get(point.timeMs) ?? { timeMs: point.timeMs }
        row[dataKey] = point.vramGB
        rowsByTime.set(point.timeMs, row)
      }
    }
  }

  return { rows: [...rowsByTime.values()].sort((a, b) => a.timeMs - b.timeMs), lines }
}

function MemoryTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: { dataKey: string; value: number; color: string }[]
  label?: number
}) {
  if (!active || !payload?.length) return null

  return (
    <div className="rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 shadow-lg">
      <p className="text-xs text-zinc-400">{(label ?? 0).toLocaleString()} ms</p>
      <div className="mt-1 flex flex-col gap-1">
        {payload.map((entry) => (
          <div key={entry.dataKey} className="flex items-center gap-2">
            <span className="h-[2px] w-3" style={{ backgroundColor: entry.color }} />
            <span className="text-xs text-zinc-400">{entry.dataKey.replace('__', ' · ')}</span>
            <span className="ml-auto text-sm font-semibold text-zinc-100">
              {entry.value.toFixed(1)} GB
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

export function MemoryBehaviorChart({
  data,
  isCustom,
  error,
  onUpload,
  onReset,
}: MemoryBehaviorChartProps) {
  const { rows, lines } = buildPhaseLines(data.series)

  return (
    <div className="flex h-full flex-col rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
      <div className="mb-1 flex items-start justify-between">
        <div>
          <h2 className="text-sm font-medium text-zinc-200">Memory Behavior</h2>
          <p className="text-xs text-zinc-500">
            {data.device || 'No data loaded'} · VRAM (GB) vs time
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
            No memory data yet — upload a results file to populate this chart.
          </p>
        </div>
      ) : (
        <div className="mt-2 h-[260px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={rows} margin={{ top: 4, right: 16, bottom: 4, left: 4 }}>
              <CartesianGrid vertical={false} stroke="#27272a" strokeWidth={1} />
              <XAxis
                dataKey="timeMs"
                type="number"
                stroke="#52525b"
                tick={{ fill: '#71717a', fontSize: 11 }}
                tickLine={false}
                axisLine={{ stroke: '#27272a' }}
                tickFormatter={(value: number) => `${value}ms`}
              />
              <YAxis
                stroke="#52525b"
                tick={{ fill: '#71717a', fontSize: 11 }}
                tickLine={false}
                axisLine={{ stroke: '#27272a' }}
                width={40}
              />
              <Tooltip cursor={{ stroke: '#3f3f46', strokeWidth: 1 }} content={<MemoryTooltip />} />
              <RechartsLegend
                verticalAlign="top"
                height={28}
                wrapperStyle={{ fontSize: 11, color: '#a1a1aa' }}
                formatter={(value: string) => value.replace('__', ' · ')}
              />
              {lines.map((line) => (
                <Line
                  key={line.dataKey}
                  dataKey={line.dataKey}
                  name={line.dataKey}
                  type="monotone"
                  stroke={line.color}
                  strokeWidth={2}
                  strokeDasharray={line.phase === 'Prefill' ? '4 4' : undefined}
                  dot={false}
                  activeDot={{ r: 4 }}
                  connectNulls={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
