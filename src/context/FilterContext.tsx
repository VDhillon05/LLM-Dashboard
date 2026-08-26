import { createContext, useContext, useState, type ReactNode } from 'react'
import type { Device } from '@/types/benchmark'

interface FilterContextValue {
  activeDevice: Device
  setActiveDevice: (device: Device) => void
}

const FilterContext = createContext<FilterContextValue | null>(null)

export function FilterProvider({ children }: { children: ReactNode }) {
  const [activeDevice, setActiveDevice] = useState<Device>('RTX 3080')

  return (
    <FilterContext.Provider value={{ activeDevice, setActiveDevice }}>
      {children}
    </FilterContext.Provider>
  )
}

export function useFilterContext() {
  const context = useContext(FilterContext)
  if (!context) {
    throw new Error('useFilterContext must be used within a FilterProvider')
  }
  return context
}
