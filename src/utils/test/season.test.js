import { seasonFor, SEASONS } from '@/utils/season'

import { describe, expect, it } from 'vitest'

const january = new Date(2026, 0, 15)
const april = new Date(2026, 3, 15)
const july = new Date(2026, 6, 15)
const october = new Date(2026, 9, 15)

const OSLO = 59.9
const SAO_PAULO = -23.5

describe('seasonFor', () => {
  it('reads the northern hemisphere by month', () => {
    expect(seasonFor(january, OSLO)).toBe('winter')
    expect(seasonFor(april, OSLO)).toBe('spring')
    expect(seasonFor(july, OSLO)).toBe('summer')
    expect(seasonFor(october, OSLO)).toBe('autumn')
  })

  it('inverts below the equator — janeiro é verão em São Paulo', () => {
    expect(seasonFor(january, SAO_PAULO)).toBe('summer')
    expect(seasonFor(april, SAO_PAULO)).toBe('autumn')
    expect(seasonFor(july, SAO_PAULO)).toBe('winter')
    expect(seasonFor(october, SAO_PAULO)).toBe('spring')
  })

  it('gives opposite seasons for the two hemispheres in every month', () => {
    for (let month = 0; month < 12; month++) {
      const date = new Date(2026, month, 10)
      expect(seasonFor(date, OSLO)).not.toBe(seasonFor(date, SAO_PAULO))
    }
  })

  it('falls back to the southern hemisphere when the latitude is unknown', () => {
    expect(seasonFor(january, null)).toBe(seasonFor(january, SAO_PAULO))
    expect(seasonFor(july, undefined)).toBe(seasonFor(july, SAO_PAULO))
    expect(seasonFor(july, NaN)).toBe(seasonFor(july, SAO_PAULO))
  })

  it('treats the equator itself as northern, without crashing', () => {
    expect(SEASONS).toContain(seasonFor(january, 0))
  })

  it('only ever returns a season the scene can paint', () => {
    for (let month = 0; month < 12; month++) {
      for (const latitude of [-80, -23.5, 0, 23.5, 80]) {
        expect(SEASONS).toContain(seasonFor(new Date(2026, month, 10), latitude))
      }
    }
  })

  it('crosses correctly at the December boundary', () => {
    expect(seasonFor(new Date(2026, 11, 1), OSLO)).toBe('winter')
    expect(seasonFor(new Date(2026, 11, 1), SAO_PAULO)).toBe('summer')
  })
})
