export const SEASONS = ['spring', 'summer', 'autumn', 'winter']

export const DEFAULT_SEASON = 'summer'

// Estações **meteorológicas** (blocos de três meses), não astronômicas: a
// diferença é de poucos dias e não vale carregar cálculo de solstício para
// escolher a cor de um chão.
const NORTHERN_BY_MONTH = [
  'winter', // jan
  'winter', // fev
  'spring', // mar
  'spring', // abr
  'spring', // mai
  'summer', // jun
  'summer', // jul
  'summer', // ago
  'autumn', // set
  'autumn', // out
  'autumn', // nov
  'winter', // dez
]

const OPPOSITE = { winter: 'summer', summer: 'winter', spring: 'autumn', autumn: 'spring' }

/**
 * Sem latitude conhecida assume hemisfério **sul**: o app é pt-BR e o custo de
 * errar para o outro lado é mostrar outono em pleno verão.
 */
const isSouthern = (latitude) => {
  if (latitude === null || latitude === undefined || Number.isNaN(latitude)) return true
  return latitude < 0
}

export const seasonFor = (date = new Date(), latitude = null) => {
  const month = date.getMonth()
  const northern = NORTHERN_BY_MONTH[month] ?? DEFAULT_SEASON
  return isSouthern(latitude) ? OPPOSITE[northern] : northern
}
