import type { BenchmarkMatrixDataset } from '@/types/benchmark'
import { FAMILY_COLOR } from '@/utils/chartColors'
import { DatasetUploadControls } from '@/components/ui/DatasetUploadControls'

interface BenchmarkTableProps {
  data: BenchmarkMatrixDataset
  isCustom?: boolean
  error?: string | null
  onUpload?: (file: File) => void
  onReset?: () => void
}

const COLUMNS = [
  { key: 'model', label: 'Model', align: 'left' },
  { key: 'quantization', label: 'Quantization', align: 'left' },
  { key: 'batch', label: 'Batch', align: 'right' },
  { key: 'prefillTokensPerSecond', label: 'Prefill tok/s', align: 'right' },
  { key: 'generationTokensPerSecond', label: 'Generation tok/s', align: 'right' },
  { key: 'peakMemoryGB', label: 'Peak memory', align: 'right' },
] as const

export function BenchmarkTable({ data, isCustom, error, onUpload, onReset }: BenchmarkTableProps) {
  const rows = data.series

  return (
    <div className="flex flex-col rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
      <div className="mb-3 flex items-start justify-between">
        <div>
          <h2 className="text-sm font-medium text-zinc-200">Benchmark Matrix</h2>
          <p className="text-xs text-zinc-500">
            {data.device || 'No data loaded'} · per-config results
            {isCustom && <span className="ml-1.5 text-zinc-600">(custom upload)</span>}
          </p>
        </div>

        {onUpload && onReset && (
          <DatasetUploadControls isCustom={!!isCustom} onUpload={onUpload} onReset={onReset} />
        )}
      </div>

      {error && <p className="mb-2 text-xs text-red-400">{error}</p>}

      {rows.length === 0 ? (
        <div className="flex min-h-[160px] items-center justify-center py-12">
          <p className="text-xs text-zinc-600">
            No benchmark matrix data yet — upload a results file to populate this table.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-zinc-800">
                {COLUMNS.map((column) => (
                  <th
                    key={column.key}
                    scope="col"
                    className={`px-3 py-2 text-xs font-medium text-zinc-500 ${
                      column.align === 'right' ? 'text-right' : 'text-left'
                    }`}
                  >
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr
                  key={`${row.model}-${row.quantization}-${row.batch}-${index}`}
                  className="border-b border-zinc-800/60 transition-colors last:border-b-0 hover:bg-zinc-800/40"
                >
                  <td className="px-3 py-2 text-zinc-200">
                    <div className="flex items-center gap-2">
                      <span
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{ backgroundColor: FAMILY_COLOR[row.family] }}
                      />
                      {row.model}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-zinc-400">{row.quantization}</td>
                  <td className="px-3 py-2 text-right font-mono tabular-nums text-zinc-300">
                    {row.batch}
                  </td>
                  <td className="px-3 py-2 text-right font-mono tabular-nums text-zinc-300">
                    {row.prefillTokensPerSecond.toFixed(1)}
                  </td>
                  <td className="px-3 py-2 text-right font-mono tabular-nums text-zinc-300">
                    {row.generationTokensPerSecond.toFixed(1)}
                  </td>
                  <td className="px-3 py-2 text-right font-mono tabular-nums text-zinc-300">
                    {row.peakMemoryGB.toFixed(1)} GB
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
