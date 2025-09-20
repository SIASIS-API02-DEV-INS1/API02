import { Request, Response, Router } from "express";
import { RolesSistema } from "../../../interfaces/shared/RolesSistema";
import { RolesTexto } from "../../../../assets/RolesTextosEspañol";
import {
  RequestErrorTypes,
  SystemErrorTypes,
  TokenErrorTypes,
} from "../../../interfaces/shared/errors";
import { ErrorResponseAPIBase } from "../../../interfaces/shared/apis/types";
import { validarGradoPorNivel } from "../../../lib/helpers/validators/data/validateGrado";
import { NivelEducativo } from "../../../interfaces/shared/NivelEducativo";
import { validarNivelEducativo } from "../../../lib/helpers/validators/data/validateNivelEducativo";
import isResponsableAuthenticated from "../../../middlewares/isResponsableAuthenticated";
import checkAuthentication from "../../../middlewares/checkAuthentication";
import { GetAulasSuccessResponse } from "../../../interfaces/shared/apis/api02/aulas/types";
import { GRADOS_EDUCATIVOS_POR_NIVELES } from "../../../constants/GRADOS_EDUCATIVOS_POR_NIVELES";
import { obtenerAulas } from "../../../../core/databases/queries/RDP03/aulas/obtenerAulas";

import AsistenciasEscolaresMensualesDeUnAulaRouter from "./[Id_Aula]/asistencias-escolares-mensuales";

const router = Router();

// Constantes para validación
export const GRADO_MAXIMO_PRIMARIA =
  GRADOS_EDUCATIVOS_POR_NIVELES[NivelEducativo.PRIMARIA].Maximo;
export const GRADO_MAXIMO_SECUNDARIA =
  GRADOS_EDUCATIVOS_POR_NIVELES[NivelEducativo.SECUNDARIA].Maximo;

// Función para parsear IDs de aulas
function parsearIdsAulas(idsString: string): string[] {
  return idsString
    .split(",")
    .map((id) => id.trim())
    .filter((id) => id.length > 0);
}

// Ruta principal para obtener aulas
router.get("/", isResponsableAuthenticated, checkAuthentication, (async (
  req: Request,
  res: Response
) => {
  try {
    const Rol = req.userRole!;
    // const userData = req.user! as ResponsableAuthenticated;
    const rdp03EnUso = req.RDP03_INSTANCE;

    // Verificar que el rol sea de responsable
    if (Rol !== RolesSistema.Responsable) {
      return res.status(403).json({
        success: false,
        message: `El token no corresponde a un ${
          RolesTexto[RolesSistema.Responsable].singular
        }`,
        errorType: TokenErrorTypes.TOKEN_WRONG_ROLE,
      } as ErrorResponseAPIBase);
    }

    // Extraer y validar parámetros de query
    const { nivel, grado, idsAulas } = req.query;

    // Primero validar parámetro opcional: aulas (para determinar si nivel es obligatorio)
    let idsAulasEspecificas: string[] | undefined;
    if (idsAulas) {
      if (typeof idsAulas !== "string") {
        return res.status(400).json({
          success: false,
          message:
            "El parámetro 'aulas' debe ser una cadena de IDs separados por comas",
          errorType: RequestErrorTypes.INVALID_PARAMETERS,
        } as ErrorResponseAPIBase);
      }

      idsAulasEspecificas = parsearIdsAulas(idsAulas);
      if (idsAulasEspecificas.length === 0) {
        return res.status(400).json({
          success: false,
          message: "El parámetro 'aulas' no contiene IDs válidos",
          errorType: RequestErrorTypes.INVALID_PARAMETERS,
        } as ErrorResponseAPIBase);
      }
    }

    // Validar parámetro nivel: obligatorio solo si NO hay idsAulas específicas
    let nivelValidado: string | undefined;
    if (!idsAulasEspecificas) {
      // Si no hay aulas específicas, nivel es obligatorio
      if (!nivel || typeof nivel !== "string") {
        return res.status(400).json({
          success: false,
          message: `El parámetro 'nivel' es obligatorio cuando no se especifican aulas. Valores válidos: ${Object.values(
            NivelEducativo
          ).join(", ")}`,
          errorType: RequestErrorTypes.MISSING_REQUIRED_PARAMETERS,
        } as ErrorResponseAPIBase);
      }

      if (!validarNivelEducativo(nivel)) {
        return res.status(400).json({
          success: false,
          message: `Nivel inválido. Valores válidos: ${Object.values(
            NivelEducativo
          ).join(", ")} (P=Primaria, S=Secundaria)`,
          errorType: RequestErrorTypes.INVALID_PARAMETERS,
        } as ErrorResponseAPIBase);
      }
      nivelValidado = nivel;
    } else {
      // Si hay aulas específicas, nivel no debe ser usado
      if (nivel && typeof nivel === "string") {
        return res.status(400).json({
          success: false,
          message:
            "El parámetro 'nivel' no es válido cuando se especifican aulas específicas",
          errorType: RequestErrorTypes.INVALID_PARAMETERS,
        } as ErrorResponseAPIBase);
      }
    }

    // Validar parámetro opcional: grado (solo válido si hay nivel)
    let gradoParsed: number | undefined;
    if (grado && nivelValidado) {
      if (typeof grado !== "string") {
        return res.status(400).json({
          success: false,
          message: "El parámetro 'grado' debe ser un número",
          errorType: RequestErrorTypes.INVALID_PARAMETERS,
        } as ErrorResponseAPIBase);
      }

      gradoParsed = parseInt(grado, 10);
      if (isNaN(gradoParsed)) {
        return res.status(400).json({
          success: false,
          message: "El parámetro 'grado' debe ser un número válido",
          errorType: RequestErrorTypes.INVALID_PARAMETERS,
        } as ErrorResponseAPIBase);
      }

      if (!validarGradoPorNivel(nivelValidado as NivelEducativo, gradoParsed)) {
        const gradoMaximo =
          nivelValidado === NivelEducativo.PRIMARIA
            ? GRADO_MAXIMO_PRIMARIA
            : GRADO_MAXIMO_SECUNDARIA;
        const nivelTexto =
          nivelValidado === NivelEducativo.PRIMARIA ? "Primaria" : "Secundaria";
        return res.status(400).json({
          success: false,
          message: `Grado inválido para ${nivelTexto}. Rango válido: 1-${gradoMaximo}`,
          errorType: RequestErrorTypes.INVALID_PARAMETERS,
        } as ErrorResponseAPIBase);
      }
    } else if (grado && !nivelValidado) {
      // Si se proporciona grado pero no nivel (cuando hay aulas específicas), mostrar error
      return res.status(400).json({
        success: false,
        message:
          "El parámetro 'grado' no es válido cuando se especifican aulas específicas",
        errorType: RequestErrorTypes.INVALID_PARAMETERS,
      } as ErrorResponseAPIBase);
    }

    // Obtener aulas básicas (solo datos del esquema T_Aulas)
    const aulasResultado = await obtenerAulas(
      {
        nivel: nivelValidado,
        grado: gradoParsed,
        idsAulas: idsAulasEspecificas,
      },
      rdp03EnUso
    );

    return res.status(200).json({
      success: true,
      data: aulasResultado,
    } as GetAulasSuccessResponse);
  } catch (error) {
    console.error("Error al obtener aulas:", error);
    return res.status(500).json({
      success: false,
      message: "Error al obtener las aulas",
      errorType: SystemErrorTypes.UNKNOWN_ERROR,
    } as ErrorResponseAPIBase);
  }
}) as any);

router.use(AsistenciasEscolaresMensualesDeUnAulaRouter);

export default router;
