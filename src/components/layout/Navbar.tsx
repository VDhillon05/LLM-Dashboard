import { Activity } from 'lucide-react'
import { useFilterContext } from '@/context/FilterContext'
import type { Device } from '@/types/benchmark'
import { cn } from '@/utils/cn'

const STATIC_LINKS = ['Benchmark report', 'Methodology']
const DEVICE_LINKS: Device[] = ['RTX 3080', 'M4 Mac mini']

export function Navbar() {
  const { activeDevice, setActiveDevice } = useFilterContext()

  return (
    <nav className="flex h-16 items-center justify-between border-b border-zinc-800 bg-zinc-950/95 px-6">
      <div className="flex items-center gap-2">
        <Activity className="h-5 w-5 text-blue-500" />
        <span className="text-sm font-semibold tracking-wide text-zinc-100">
          BenchPulse
        </span>
      </div>

      <ul className="flex items-center gap-2">
        <li>
          <a
            href="#"
            className="rounded-md px-2.5 py-1.5 text-sm text-zinc-400 transition-colors hover:text-zinc-100"
          >
            {STATIC_LINKS[0]}
          </a>
        </li>
        {DEVICE_LINKS.map((device) => (
          <li key={device}>
            <button
              type="button"
              onClick={() => setActiveDevice(device)}
              aria-pressed={activeDevice === device}
              className={cn(
                'rounded-md px-2.5 py-1.5 text-sm transition-colors',
                activeDevice === device
                  ? 'bg-zinc-800 text-white'
                  : 'text-zinc-400 hover:text-zinc-100',
              )}
            >
              {device}
            </button>
          </li>
        ))}
        <li>
          <a
            href="#"
            className="rounded-md px-2.5 py-1.5 text-sm text-zinc-400 transition-colors hover:text-zinc-100"
          >
            {STATIC_LINKS[1]}
          </a>
        </li>
      </ul>
    </nav>
  )
}
