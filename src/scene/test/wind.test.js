import { WIND_CEILING_KMH, windStrength } from '@/scene/wind'

import { describe, expect, it } from 'vitest'

describe('windStrength', () => {
  it('is zero for dead calm', () => {
    expect(windStrength(0)).toBe(0)
  })

  it('grows with the measured wind', () => {
    expect(windStrength(10)).toBeLessThan(windStrength(25))
    expect(windStrength(25)).toBeLessThan(windStrength(40))
  })

  it('reaches full strength at the ceiling', () => {
    expect(windStrength(WIND_CEILING_KMH)).toBe(1)
  })

  it('clamps above the ceiling, so a gale does not double the cloud speed', () => {
    expect(windStrength(WIND_CEILING_KMH * 3)).toBe(1)
    expect(windStrength(500)).toBe(1)
  })

  it('treats a missing measure as calm instead of NaN-ing the scene', () => {
    expect(windStrength(null)).toBe(0)
    expect(windStrength(undefined)).toBe(0)
    expect(windStrength(NaN)).toBe(0)
  })

  it('clamps a negative reading to calm', () => {
    expect(windStrength(-12)).toBe(0)
  })

  it('stays within 0..1 across the plausible range', () => {
    for (let kmh = 0; kmh <= 150; kmh += 5) {
      const strength = windStrength(kmh)
      expect(strength).toBeGreaterThanOrEqual(0)
      expect(strength).toBeLessThanOrEqual(1)
    }
  })
})
