export type TipoEscalar = 'int' | 'float' | 'bool' | 'string'
export type TipoDato = TipoEscalar | `list<${TipoEscalar}>`

export type Parametro = { nombre: string; tipo: TipoDato }

export type ValorEscalar = number | boolean | string
export type Valor = ValorEscalar | ValorEscalar[]

export function tipoEscalarDeLista(tipo: TipoDato): TipoEscalar | null {
  const coincidencia = /^list<(int|float|bool|string)>$/.exec(tipo)
  return coincidencia ? (coincidencia[1] as TipoEscalar) : null
}

function valorCoincideConEscalar(valor: unknown, tipo: TipoEscalar): boolean {
  if (tipo === 'int') return typeof valor === 'number' && Number.isInteger(valor)
  if (tipo === 'float') return typeof valor === 'number'
  if (tipo === 'bool') return typeof valor === 'boolean'
  return typeof valor === 'string'
}

export function valorCoincideConTipo(valor: unknown, tipo: TipoDato): boolean {
  const escalar = tipoEscalarDeLista(tipo)
  if (escalar) {
    return Array.isArray(valor) && valor.every((v) => valorCoincideConEscalar(v, escalar))
  }
  return valorCoincideConEscalar(valor, tipo as TipoEscalar)
}
