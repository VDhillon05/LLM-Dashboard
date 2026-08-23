import { describe, expect, it } from 'vitest'
import { FAMILY_COLOR, PHASE_COLOR } from '@/utils/chartColors'

describe('chart colors', () => {
  it('defines stable colors for each model family', () => {
    expect(FAMILY_COLOR).toEqual({
      Llama: '#0891b2',
      Phi: '#a855f7',
      Qwen: '#d97706',
    })
  })

  it('uses distinct colors for memory phases', () => {
    expect(PHASE_COLOR.Prefill).not.toBe(PHASE_COLOR.Decode)
  })
})
