import { describe, expect, it } from 'vitest'
import { FAMILY_COLOR } from '@/utils/chartColors'

describe('chart colors', () => {
  it('defines stable colors for each model family', () => {
    expect(FAMILY_COLOR).toEqual({
      Llama: '#0891b2',
      Phi: '#a855f7',
      Qwen: '#d97706',
    })
  })
})
