/**
 * Damping exponencial: a cada frame o valor percorre uma fração do que falta
 * para o alvo. Preferido a uma timeline de duração fixa porque, se o cenário
 * mudar no meio da transição, o valor apenas passa a convergir para o novo
 * alvo — não há corte nem tween a cancelar.
 */

/** Fração do caminho restante a percorrer num passo de `dt` segundos. */
export const dampFactor = (lambda, dt) => 1 - Math.exp(-lambda * Math.max(dt, 0))

export const approach = (current, target, lambda, dt) =>
  current + (target - current) * dampFactor(lambda, dt)

export const isSettled = (current, target, epsilon = 0.002) =>
  Math.abs(target - current) <= epsilon
