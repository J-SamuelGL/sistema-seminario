import type { Parametro, TipoDato, Valor } from '../tipos'
import { generarProgramaPython } from './python'
import { generarProgramaJavascript } from './javascript'
import { generarProgramaPhp } from './php'
import { generarProgramaJava } from './java'
import { generarProgramaCsharp } from './csharp'

type GeneradorPrograma = (
  codigoParticipante: string,
  nombreFuncion: string,
  parametros: Parametro[],
  tipoRetorno: TipoDato,
  argumentos: Valor[],
) => { archivo: string; contenido: string }

const GENERADORES: Record<string, GeneradorPrograma> = {
  python: generarProgramaPython,
  javascript: generarProgramaJavascript,
  php: generarProgramaPhp,
  java: generarProgramaJava,
  csharp: generarProgramaCsharp,
}

export function generarPrograma(
  lenguaje: string,
  codigoParticipante: string,
  nombreFuncion: string,
  parametros: Parametro[],
  tipoRetorno: TipoDato,
  argumentos: Valor[],
): { archivo: string; contenido: string } {
  const generador = GENERADORES[lenguaje]
  if (!generador) throw new Error(`Lenguaje no soportado: ${lenguaje}`)
  return generador(
    codigoParticipante,
    nombreFuncion,
    parametros,
    tipoRetorno,
    argumentos,
  )
}
