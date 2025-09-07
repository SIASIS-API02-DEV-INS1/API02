import { Request, Response, Router } from "express";

import {
  MisEstudianteRelacionadoAsistenciasMensualesSuccessResponse,
  MisEstudianteRelacionadoAsistenciasMensualesErrorAPI02,
} from "../../../../../interfaces/shared/apis/api02/mis-estudiantes-relacionados/asistencias-mensuales/types";
import {
  CONTROL_ASISTENCIA_DE_SALIDA_SECUNDARIA,
  CONTROL_ASISTENCIA_DE_SALIDA_PRIMARIA,
} from "../../../../../constants/ASISTENCIA_ENTRADA_SALIDA_ESCOLAR";
import { obtenerDatosEscolaresEstudiantes } from "../../../../../../core/databases/queries/RDP03/estudiantes/obtenerDatosEstudiantes";
import { verificarRelacionEstudianteResponsable } from "../../../../../../core/databases/queries/RDP03/relaciones-estudiante-responsable/verificarRelacionEstudianteResponsable";
import { ResponsableAuthenticated } from "../../../../../interfaces/shared/JWTPayload";
import { obtenerTablaAsistenciasEscolaresPorNivelYGrado } from "../../../../../lib/utils/obtenerTablaAsistenciasEscolaresPorNivelYGrado";
import { obtenerAsistenciasMensualesEstudiante } from "../../../../../../core/databases/queries/RDP03/asistencias-escolares-mensuales/obtenerAsistenciasMensualesEstudiante";
import { NivelEducativo } from "../../../../../interfaces/shared/NivelEducativo";

import {
  DataConflictErrorTypes,
  DataErrorTypes,
  SystemErrorTypes,
  TokenErrorTypes,
  UserErrorTypes,
  ValidationErrorTypes,
} from "../../../../../interfaces/shared/errors";
import { parsearAsistenciasEscolares } from "../../../../../lib/utils/parsearAsistenciasEscolares";

const router = Router();

router.get("/:Id_Estudiante/asistencias-mensuales", (async (
  req: Request,
  res: Response
) => {
  try {
    const { Id_Estudiante } = req.params;
    const userData = req.user! as ResponsableAuthenticated;
    const rdp03EnUso = req.RDP03_INSTANCE;

    // Validar que el parámetro Id_Estudiante esté presente
    if (!Id_Estudiante) {
      return res.status(400).json({
        success: false,
        message: "El ID del estudiante es requerido",
        errorType: ValidationErrorTypes.REQUIRED_FIELDS,
      } as MisEstudianteRelacionadoAsistenciasMensualesErrorAPI02);
    }

    // Obtener el mes de consulta (query parameter opcional, por defecto mes actual)
    const mesConsulta = req.query.Mes
      ? parseInt(req.query.Mes as string)
      : new Date().getMonth() + 1;

    // Validar que el mes esté en rango válido
    if (mesConsulta < 1 || mesConsulta > 12) {
      return res.status(400).json({
        success: false,
        message: "El mes debe estar entre 1 y 12",
        errorType: ValidationErrorTypes.INVALID_FORMAT,
      } as MisEstudianteRelacionadoAsistenciasMensualesErrorAPI02);
    }

    // Verificar si el estudiante tiene relación con el responsable
    const tieneRelacion = await verificarRelacionEstudianteResponsable(
      Id_Estudiante,
      userData.Id_Responsable,
      rdp03EnUso
    );

    if (!tieneRelacion) {
      return res.status(403).json({
        success: false,
        message:
          "No tiene permisos para acceder a las asistencias de este estudiante",
        errorType: TokenErrorTypes.TOKEN_UNAUTHORIZED,
      } as MisEstudianteRelacionadoAsistenciasMensualesErrorAPI02);
    }

    // Obtener datos escolares del estudiante (nivel, grado, estado)
    const datosEstudiante = await obtenerDatosEscolaresEstudiantes(
      Id_Estudiante,
      rdp03EnUso
    );

    if (!datosEstudiante || !datosEstudiante.existe) {
      return res.status(404).json({
        success: false,
        message: "El estudiante no fue encontrado",
        errorType: DataErrorTypes.MISSING_DATA,
      } as MisEstudianteRelacionadoAsistenciasMensualesErrorAPI02);
    }

    if (!datosEstudiante.estado) {
      return res.status(400).json({
        success: false,
        message: "El estudiante no está activo en el sistema",
        errorType: UserErrorTypes.USER_INACTIVE,
      } as MisEstudianteRelacionadoAsistenciasMensualesErrorAPI02);
    }

    if (!datosEstudiante.nivel || !datosEstudiante.grado) {
      return res.status(400).json({
        success: false,
        message: "El estudiante no tiene aula asignada",
        errorType: DataConflictErrorTypes.MISSING_REQUIRED_DATA,
      } as MisEstudianteRelacionadoAsistenciasMensualesErrorAPI02);
    }

    // Determinar la tabla de asistencias correcta
    const tablaAsistencias = obtenerTablaAsistenciasEscolaresPorNivelYGrado(
      datosEstudiante.nivel,
      datosEstudiante.grado
    );

    // Obtener las asistencias mensuales
    const asistenciasString = await obtenerAsistenciasMensualesEstudiante(
      Id_Estudiante,
      tablaAsistencias,
      mesConsulta,
      rdp03EnUso
    );

    // Si no hay asistencias para el mes, devolver 404
    if (!asistenciasString) {
      return res.status(404).json({
        success: false,
        message: `No se encontraron registros de asistencia para el estudiante en el mes ${mesConsulta}`,
        errorType: DataErrorTypes.MISSING_DATA,
      } as MisEstudianteRelacionadoAsistenciasMensualesErrorAPI02);
    }

    // Determinar si incluir salidas según el nivel del estudiante
    const incluirSalidas =
      datosEstudiante.nivel === NivelEducativo.PRIMARIA
        ? CONTROL_ASISTENCIA_DE_SALIDA_PRIMARIA
        : CONTROL_ASISTENCIA_DE_SALIDA_SECUNDARIA;

    // Parsear las asistencias según la configuración
    const asistenciasParsedas = parsearAsistenciasEscolares(
      asistenciasString,
      incluirSalidas
    );

    // Verificar si el objeto parseado tiene contenido
    const totalRegistros = Object.keys(asistenciasParsedas).length;

    if (totalRegistros === 0) {
      return res.status(404).json({
        success: false,
        message: `No se encontraron asistencias válidas para el estudiante en el mes ${mesConsulta}`,
        errorType: DataErrorTypes.MISSING_DATA,
      } as MisEstudianteRelacionadoAsistenciasMensualesErrorAPI02);
    }

    return res.status(200).json({
      success: true,
      data: {
        Mes: mesConsulta,
        Asistencias: asistenciasParsedas,
      },
      total: totalRegistros,
    } as MisEstudianteRelacionadoAsistenciasMensualesSuccessResponse);
  } catch (error) {
    console.error(
      "Error al obtener asistencias mensuales del estudiante:",
      error
    );
    return res.status(500).json({
      success: false,
      message: "Error interno del servidor al obtener las asistencias",
      errorType: SystemErrorTypes.UNKNOWN_ERROR,
      details: error,
    } as MisEstudianteRelacionadoAsistenciasMensualesErrorAPI02);
  }
}) as any);

export default router;
