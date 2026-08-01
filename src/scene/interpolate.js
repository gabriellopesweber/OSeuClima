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

/** Ângulo reduzido ao intervalo canônico (−π, π]. */
export const wrapAngle = (angle) => Math.atan2(Math.sin(angle), Math.cos(angle))

/**
 * Damping de um ângulo, pelo caminho mais curto.
 *
 * Ângulo é circular: −179° e +179° são vizinhos, mas a subtração crua diz que
 * estão a 358° de distância. Sem esta correção, um astro que cruza o ponto
 * oposto à câmera faria a volta inteira pelo céu em vez de continuar o arco.
 *
 * O resultado é reduzido a (−π, π] a cada passo, e isso **não** é cosmético: o
 * rumo do domo é multiplicado por `spread` antes de virar posição, e essa
 * multiplicação não sobrevive a um múltiplo de 2π. Sem a redução, uma sequência
 * de alvos pode deixar o valor uma volta abaixo do alvo — igual como ângulo,
 * convergido para o damping, e ainda assim do outro lado do céu depois de
 * comprimido. Foi exatamente assim que uma lua a nordeste apareceu a oeste.
 */
export const approachAngle = (current, target, lambda, dt) => {
  const delta = wrapAngle(target - current)
  return wrapAngle(current + delta * dampFactor(lambda, dt))
}

export const isSettled = (current, target, epsilon = 0.002) =>
  Math.abs(target - current) <= epsilon
