import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend as RechartsLegend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type {
  DecodingSpeedupEntry,
  MultiTokenPredictionBenchmark,
} from '@/types/benchmark'
import { FAMILY_COLOR } from '@/utils/chartColors'

interface MultiTokenPredictionProps {
  data: MultiTokenPredictionBenchmark
}

interface AcceptanceRateRow {
  draftLength: number
  [model: string]: number
}

function mergeAcceptanceRateByDraftLength(
  series: MultiTokenPredictionBenchmark['acceptanceRate'],
): AcceptanceRateRow[] {
  const rowsByDraftLength = new Map<number, AcceptanceRateRow>()

  for (const { model, points } of series) {
    for (const point of points) {
      const row =
        rowsByDraftLength.get(point.draftLength) ?? { draftLength: point.draftLength }
      row[model] = point.acceptanceRate
      rowsByDraftLength.set(point.draftLength, row)
    }
  }

  return [...rowsByDraftLength.values()].sort((a, b) => a.draftLength - b.draftLength)
}

function SpeedupTooltip({
  active,
  payload,
}: {
  active?: boolean
  payload?: { payload: DecodingSpeedupEntry }[]
}) {
  if (!active || !payload?.length) return null
  const row = payload[0].payload

  return (
    <div className="rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 shadow-lg">
      <div className="flex items-center gap-2">
        <span className="h-[2px] w-3" style={{ backgroundColor: FAMILY_COLOR[row.family] }} />
        <span className="text-xs text-zinc-400">{row.model}</span>
      </div>
      <p className="mt-1 text-sm font-semibold text-zinc-100">{row.speedup.toFixed(1)}x</p>
    </div>
  )
}

function AcceptanceRateTooltip({
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
      <p className="text-xs text-zinc-400">Draft length {label}</p>
      <div className="mt-1 flex flex-col gap-1">
        {payload.map((entry) => (
          <div key={entry.name} className="flex items-center gap-2">
            <span className="h-[2px] w-3" style={{ backgroundColor: entry.color }} />
            <span className="text-xs text-zinc-400">{entry.name}</span>
            <span className="ml-auto text-sm font-semibold text-zinc-100">
              {(entry.value * 100).toFixed(0)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

export function MultiTokenPrediction({ data }: MultiTokenPredictionProps) {
  const acceptanceRows = mergeAcceptanceRateByDraftLength(data.acceptanceRate)

  return (
    <div className="flex h-full flex-col rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
      <div className="mb-1">
        <h2 className="text-sm font-medium text-zinc-200">Multi-Token Prediction</h2>
        <p className="text-xs text-zinc-500">{data.device} · speculative decoding</p>
      </div>

      <div className="mt-2 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <p className="mb-1 px-1 text-xs text-zinc-500">Decoding speedup</p>
          <div className="h-[220px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data.decodingSpeedup}
                margin={{ top: 4, right: 8, bottom: 4, left: 4 }}
                barSize={28}
              >
                <CartesianGrid vertical={false} stroke="#27272a" strokeWidth={1} />
                <XAxis
                  dataKey="model"
                  stroke="#52525b"
                  tick={{ fill: '#a1a1aa', fontSize: 10 }}
                  tickLine={false}
                  axisLine={{ stroke: '#27272a' }}
                />
                <YAxis
                  stroke="#52525b"
                  tick={{ fill: '#71717a', fontSize: 11 }}
                  tickLine={false}
                  axisLine={{ stroke: '#27272a' }}
                  width={32}
                  tickFormatter={(value: number) => `${value}x`}
                />
                <Tooltip cursor={{ fill: '#ffffff', opacity: 0.04 }} content={<SpeedupTooltip />} />
                <Bar dataKey="speedup" radius={[4, 4, 0, 0]}>
                  {data.decodingSpeedup.map((entry) => (
                    <Cell key={entry.model} fill={FAMILY_COLOR[entry.family]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div>
          <p className="mb-1 px-1 text-xs text-zinc-500">Acceptance rate</p>
          <div className="h-[220px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={acceptanceRows} margin={{ top: 4, right: 8, bottom: 4, left: 4 }}>
                <CartesianGrid vertical={false} stroke="#27272a" strokeWidth={1} />
                <XAxis
                  dataKey="draftLength"
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
                  width={40}
                  domain={[0, 1]}
                  tickFormatter={(value: number) => `${Math.round(value * 100)}%`}
                />
                <Tooltip
                  cursor={{ stroke: '#3f3f46', strokeWidth: 1 }}
                  content={<AcceptanceRateTooltip />}
                />
                <RechartsLegend
                  verticalAlign="top"
                  height={24}
                  wrapperStyle={{ fontSize: 11, color: '#a1a1aa' }}
                />
                {data.acceptanceRate.map(({ model, family }) => (
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
      </div>
    </div>
  )
}
