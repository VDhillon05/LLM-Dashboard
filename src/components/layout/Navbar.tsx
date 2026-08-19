import { Activity } from 'lucide-react'

const NAV_LINKS = ['Benchmark report', 'RTX 3080', 'M4 Mac mini', 'Methodology']

export function Navbar() {
  return (
    <nav className="flex h-16 items-center justify-between border-b border-zinc-800 bg-zinc-950/95 px-6">
      <div className="flex items-center gap-2">
        <Activity className="h-5 w-5 text-blue-500" />
        <span className="text-sm font-semibold tracking-wide text-zinc-100">
          BenchPulse
        </span>
      </div>

      <ul className="flex items-center gap-6">
        {NAV_LINKS.map((link) => (
          <li key={link}>
            <a
              href="#"
              className="text-sm text-zinc-400 transition-colors hover:text-zinc-100"
            >
              {link}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  )
}
