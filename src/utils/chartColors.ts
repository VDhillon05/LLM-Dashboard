import type { ModelFamily } from '@/types/benchmark'

// Fixed categorical hues — reused across every chart so a model's
// identity color never changes between panels. Validated for dark
// mode (lightness band, CVD separation, contrast) via dataviz palette rules.
export const FAMILY_COLOR: Record<ModelFamily, string> = {
  Llama: '#0891b2', // cyan
  Phi: '#a855f7', // purple
  Qwen: '#d97706', // amber
}

// Phase colors for the memory chart — deliberately distinct from
// FAMILY_COLOR so "Decode" is never mistaken for the Qwen series.
export const PHASE_COLOR = {
  Prefill: '#2563eb', // blue
  Decode: '#db2777', // pink
} as const
