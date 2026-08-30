// Fixed categorical hues — reused across every chart so a model's
// identity color never changes between panels. Validated for dark
// mode (lightness band, CVD separation, contrast) via dataviz palette rules.
export const FAMILY_COLOR: Record<string, string> = {
  Llama: '#0891b2', // cyan
  Phi: '#a855f7', // purple
  Qwen: '#d97706', // amber
}

export function getFamilyColor(family: string): string {
  return FAMILY_COLOR[family] ?? '#71717a'
}

