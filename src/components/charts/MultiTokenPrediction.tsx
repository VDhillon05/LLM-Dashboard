import {
  CartesianGrid,
  Legend as RechartsLegend,
  Scatter,
  ScatterChart,
  Tooltip,
  ResponsiveContainer,
  XAxis,
  YAxis,
  ZAxis,
} from 'recharts'
import type {
  AcceptanceRateDataset,
  DecodingSpeedupDataset,
  ModelFamily,
} from '@/types/benchmark'
import { FAMILY_COLOR } from '@/utils/chartColors'
import { DatasetUploadControls } from '@/components/ui/DatasetUploadControls'

interface MultiTokenPredictionProps {
  decodingSpeedup: DecodingSpeedupDataset
  acceptanceRate: AcceptanceRateDataset
  speedupIsCustom?: boolean
  speedupError?: string | null
  onUploadSpeedup?: (file: File) => void
  onResetSpeedup?: () => void
  acceptanceIsCustom?: boolean
  acceptanceError?: string | null
  onUploadAcceptance?: (file: File) => void
  onResetAcceptance?: () => void
}

interface ScatterPoint {
  model: string
  family: ModelFamily
  speedup: number
  acceptanceRate: number
}

function average(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

// Joins the two independent raw files by model — speedup is a flat summary
// stat, acceptance rate is a time series we reduce to a mean per model.
function joinByModel(
  decodingSpeedup: DecodingSpeedupDataset,
  acceptanceRate: AcceptanceRateDataset,
): ScatterPoint[] {
  const avgAcceptanceByModel = new Map<string, number>()
  for (const series of acceptanceRate.series) {
    if (series.points.length === 0) continue
    avgAcceptanceByModel.set(
      series.model,
      average(series.points.map((p) => p.acceptanceRate)),
    )
  }

  return decodingSpeedup.series
    .filter((entry) => avgAcceptanceByModel.has(entry.model))
    .map((entry) => ({
      model: entry.model,
      family: entry.family,
      speedup: entry.speedup,
      acceptanceRate: avgAcceptanceByModel.get(entry.model)!,
    }))
}

function ScatterTooltip({
  active,
  payload,
}: {
  active?: boolean
  payload?: { payload: ScatterPoint }[]
}) {
  if (!active || !payload?.length) return null
  const point = payload[0].payload

  return (
    <div className="rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 shadow-lg">
      <div className="flex items-center gap-2">
        <span
          className="h-2.5 w-2.5 rounded-full"
          style={{ backgroundColor: FAMILY_COLOR[point.family] }}
        />
        <span className="text-xs text-zinc-400">{point.model}</span>
      </div>
      <p className="mt-1 text-sm font-semibold text-zinc-100">
        {point.speedup.toFixed(1)}x speedup
      </p>
      <p className="text-xs text-zinc-500">
        {(point.acceptanceRate * 100).toFixed(0)}% avg acceptance
      </p>
    </div>
  )
}

export function MultiTokenPrediction({
  decodingSpeedup,
  acceptanceRate,
  speedupIsCustom,
  speedupError,
  onUploadSpeedup,
  onResetSpeedup,
  acceptanceIsCustom,
  acceptanceError,
  onUploadAcceptance,
  onResetAcceptance,
}: MultiTokenPredictionProps) {
  const points = joinByModel(decodingSpeedup, acceptanceRate)
  const families = [...new Set(points.map((p) => p.family))]

  return (
    <div className="flex h-full flex-col rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
      <div className="mb-1 flex items-start justify-between">
        <div>
          <h2 className="text-sm font-medium text-zinc-200">Multi-Token Prediction</h2>
          <p className="text-xs text-zinc-500">
            {decodingSpeedup.device || acceptanceRate.device || 'No data loaded'} · speedup vs.
            acceptance rate
          </p>
        </div>

        <div className="flex items-center gap-3">
          {onUploadSpeedup && onResetSpeedup && (
            <div title="Decoding speedup file">
              <DatasetUploadControls
                isCustom={!!speedupIsCustom}
                onUpload={onUploadSpeedup}
                onReset={onResetSpeedup}
              />
            </div>
          )}
          {onUploadAcceptance && onResetAcceptance && (
            <div title="Acceptance rate file">
              <DatasetUploadControls
                isCustom={!!acceptanceIsCustom}
                onUpload={onUploadAcceptance}
                onReset={onResetAcceptance}
              />
            </div>
          )}
        </div>
      </div>

      {(speedupError || acceptanceError) && (
        <p className="mb-2 text-xs text-red-400">{speedupError ?? acceptanceError}</p>
      )}

      {points.length === 0 ? (
        <div className="flex flex-1 items-center justify-center py-16">
          <p className="text-xs text-zinc-600">
            No multi-token prediction data yet — upload the speedup and acceptance rate files to
            populate this chart.
          </p>
        </div>
      ) : (
        <div className="mt-2 h-[260px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 4, right: 16, bottom: 4, left: 4 }}>
              <CartesianGrid stroke="#27272a" strokeWidth={1} />
              <XAxis
                dataKey="acceptanceRate"
                type="number"
                domain={[0, 1]}
                name="Acceptance rate"
                stroke="#52525b"
                tick={{ fill: '#71717a', fontSize: 11 }}
                tickLine={false}
                axisLine={{ stroke: '#27272a' }}
                tickFormatter={(value: number) => `${Math.round(value * 100)}%`}
              />
              <YAxis
                dataKey="speedup"
                type="number"
                name="Decoding speedup"
                stroke="#52525b"
                tick={{ fill: '#71717a', fontSize: 11 }}
                tickLine={false}
                axisLine={{ stroke: '#27272a' }}
                width={36}
                tickFormatter={(value: number) => `${value}x`}
              />
              <ZAxis range={[80, 80]} />
              <Tooltip cursor={{ stroke: '#3f3f46', strokeWidth: 1 }} content={<ScatterTooltip />} />
              {families.length > 1 && (
                <RechartsLegend
                  verticalAlign="top"
                  height={28}
                  wrapperStyle={{ fontSize: 12, color: '#a1a1aa' }}
                />
              )}
              {families.map((family) => (
                <Scatter
                  key={family}
                  name={family}
                  data={points.filter((p) => p.family === family)}
                  fill={FAMILY_COLOR[family]}
                />
              ))}
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
