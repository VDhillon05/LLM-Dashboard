import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { MemoryBehaviorBenchmark, MemoryBehaviorEntry } from '@/types/benchmark'
import { PHASE_COLOR } from '@/utils/chartColors'

interface MemoryBehaviorChartProps {
  data: MemoryBehaviorBenchmark
}

function MemoryBehaviorTooltip({
  active,
  payload,
}: {
  active?: boolean
  payload?: { payload: MemoryBehaviorEntry }[]
}) {
  if (!active || !payload?.length) return null
  const row = payload[0].payload
  const total = row.prefillVramGB + row.decodeVramGB

  return (
    <div className="rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 shadow-lg">
      <p className="text-xs text-zinc-400">{row.model}</p>
      <div className="mt-1 flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className="h-[2px] w-3" style={{ backgroundColor: PHASE_COLOR.Prefill }} />
          <span className="text-xs text-zinc-400">Prefill</span>
          <span className="ml-auto text-sm font-semibold text-zinc-100">
            {row.prefillVramGB.toFixed(1)} GB
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-[2px] w-3" style={{ backgroundColor: PHASE_COLOR.Decode }} />
          <span className="text-xs text-zinc-400">Decode</span>
          <span className="ml-auto text-sm font-semibold text-zinc-100">
            {row.decodeVramGB.toFixed(1)} GB
          </span>
        </div>
      </div>
      <p className="mt-1 border-t border-zinc-800 pt-1 text-xs text-zinc-500">
        Total {total.toFixed(1)} GB
      </p>
    </div>
  )
}

function Legend() {
  return (
    <div className="flex items-center gap-4 px-1">
      {(Object.keys(PHASE_COLOR) as (keyof typeof PHASE_COLOR)[]).map((phase) => (
        <div key={phase} className="flex items-center gap-1.5">
          <span
            className="h-2.5 w-2.5 rounded-[2px]"
            style={{ backgroundColor: PHASE_COLOR[phase] }}
          />
          <span className="text-xs text-zinc-500">{phase}</span>
        </div>
      ))}
    </div>
  )
}

export function MemoryBehaviorChart({ data }: MemoryBehaviorChartProps) {
  return (
    <div className="flex h-full flex-col rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
      <div className="mb-1">
        <h2 className="text-sm font-medium text-zinc-200">Memory Behavior</h2>
        <p className="text-xs text-zinc-500">{data.device} · VRAM usage (GB)</p>
      </div>

      <Legend />

      <div className="mt-2 h-[260px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data.entries}
            margin={{ top: 4, right: 16, bottom: 4, left: 4 }}
            barSize={32}
          >
            <CartesianGrid vertical={false} stroke="#27272a" strokeWidth={1} />
            <XAxis
              dataKey="model"
              stroke="#52525b"
              tick={{ fill: '#a1a1aa', fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: '#27272a' }}
            />
            <YAxis
              stroke="#52525b"
              tick={{ fill: '#71717a', fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: '#27272a' }}
              width={40}
            />
            <Tooltip
              cursor={{ fill: '#ffffff', opacity: 0.04 }}
              content={<MemoryBehaviorTooltip />}
            />
            <Bar
              dataKey="prefillVramGB"
              stackId="vram"
              fill={PHASE_COLOR.Prefill}
              radius={[0, 0, 0, 0]}
            />
            <Bar
              dataKey="decodeVramGB"
              stackId="vram"
              fill={PHASE_COLOR.Decode}
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
