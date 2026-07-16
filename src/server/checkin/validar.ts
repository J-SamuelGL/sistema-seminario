import { z } from 'zod'

// usuarios.tokenIngreso es varchar(255)
export const tokenIngresoSchema = z.string().trim().min(1).max(255)
