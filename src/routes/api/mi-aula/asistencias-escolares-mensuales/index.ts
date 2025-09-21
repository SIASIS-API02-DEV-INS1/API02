import { Request, Response, Router } from "express";
import { RolesSistema } from "../../../../interfaces/shared/RolesSistema";
import { RolesTexto } from "../../../../../assets/RolesTextosEspañol";
import {
  DataErrorTypes,
  RequestErrorTypes,
  SystemErrorTypes,
  TokenErrorTypes,
} from "../../../../interfaces/shared/errors";
import { ErrorResponseAPIBase } from "../../../../interfaces/shared/apis/types";
import {
  ProfesorPrimariaAuthenticated,
  ProfesorTutorSecundariaAuthenticated,
} from "../../../../interfaces/shared/JWTPayload";
import { obtenerAulaDelProfesor } from "../../../../../core/databases/queries/RDP03/aulas/obtenerAulaDelProfesor";
import { NivelEducativo } from "../../../../interfaces/shared/NivelEducativo";
import { obtenerTablaAsistenciasEscolaresPorNivelYGrado } from "../../../../lib/utils/obtenerTablaAsistenciasEscolaresPorNivelYGrado";
import {
  CONTROL_ASISTENCIA_DE_SALIDA_PRIMARIA,
  CONTROL_ASISTENCIA_DE_SALIDA_SECUNDARIA,
} from "../../../../constants/ASISTENCIA_ENTRADA_SALIDA_ESCOLAR";
import { obtenerAsistenciasMensualesDeAula } from "../../../../../core/databases/queries/RDP03/aulas/obtenerAsistenciasMensualesDeAula";
import { parsearAsistenciasEscolares } from "../../../../lib/utils/parsearAsistenciasEscolares";
import { GetAsistenciasEscolaresMensualesDeMiAulaSuccessResponse } from "../../../../interfaces/shared/apis/api02/mi-aula/asistencias-escolares-mensuales/types";

const router = Router();

router.get("/", (async (
  req: Request,
  res: Response
) => {
  try {
    const Rol = req.userRole!;
    const userData = req.user!;
    const rdp03EnUso = req.RDP03_INSTANCE;

    // Verificar que el rol sea Profesor de Primaria o Tutor
    if (![RolesSistema.ProfesorPrimaria, RolesSistema.Tutor].includes(Rol)) {
      return res.status(403).json({
        success: false,
        message: `El token no corresponde a un ${
          RolesTexto[RolesSistema.ProfesorPrimaria].singular
        } o ${RolesTexto[RolesSistema.Tutor].singular}`,
        errorType: TokenErrorTypes.TOKEN_WRONG_ROLE,
      } as ErrorResponseAPIBase);
    }

    // Obtener y validar parámetro Mes
    const mesConsulta = req.query.Mes
      ? parseInt(req.query.Mes as string)
      : new Date().getMonth() + 1;

    if (isNaN(mesConsulta) || mesConsulta < 1 || mesConsulta > 12) {
      return res.status(400).json({
        success: false,
        message: "El parámetro 'Mes' debe ser un número entre 1 y 12",
        errorType: RequestErrorTypes.INVALID_PARAMETERS,
      } as ErrorResponseAPIBase);
    }

    // Extraer el ID del profesor según el rol
    let idProfesor: string;

    if (Rol === RolesSistema.ProfesorPrimaria) {
      const profesorData = userData as ProfesorPrimariaAuthenticated;
      idProfesor = profesorData.Id_Profesor_Primaria;
    } else {
      // Tutor
      const tutorData = userData as ProfesorTutorSecundariaAuthenticated;
      idProfesor = tutorData.Id_Profesor_Secundaria;
    }

    // Obtener el aula asignada al profesor/tutor
    const miAula = await obtenerAulaDelProfesor(idProfesor, Rol, rdp03EnUso);

    if (!miAula) {
      return res.status(404).json({
        success: false,
        message: "No se encontró un aula asignada para este profesor",
        errorType: DataErrorTypes.MISSING_DATA,
      } as ErrorResponseAPIBase);
    }

    // Determinar la tabla de asistencias correcta
    const tablaAsistencias = obtenerTablaAsistenciasEscolaresPorNivelYGrado(
      miAula.Nivel as NivelEducativo,
      miAula.Grado
    );

    // Determinar si incluir salidas según el nivel del aula
    const incluirSalidas =
      miAula.Nivel === NivelEducativo.PRIMARIA
        ? CONTROL_ASISTENCIA_DE_SALIDA_PRIMARIA
        : CONTROL_ASISTENCIA_DE_SALIDA_SECUNDARIA;

    // Obtener las asistencias mensuales de todos los estudiantes del aula
    const asistenciasRaw = await obtenerAsistenciasMensualesDeAula(
      miAula.Id_Aula,
      tablaAsistencias,
      mesConsulta,
      rdp03EnUso
    );

    if (!asistenciasRaw || asistenciasRaw.length === 0) {
      return res.status(404).json({
        success: false,
        message: `No se encontraron registros de asistencia para su aula en el mes ${mesConsulta}`,
        errorType: DataErrorTypes.MISSING_DATA,
      } as ErrorResponseAPIBase);
    }

    // Procesar las asistencias de todos los estudiantes
    const asistenciasEscolares: Record<string, Record<number, any>> = {};

    for (const registro of asistenciasRaw) {
      const asistenciasParsedas = parsearAsistenciasEscolares(
        registro.Asistencias_Mensuales,
        incluirSalidas
      );

      // Solo agregar si tiene asistencias válidas
      if (Object.keys(asistenciasParsedas).length > 0) {
        asistenciasEscolares[registro.Id_Estudiante] = asistenciasParsedas;
      }
    }

    // Verificar si hay datos procesados
    if (Object.keys(asistenciasEscolares).length === 0) {
      return res.status(404).json({
        success: false,
        message: `No se encontraron asistencias válidas para su aula en el mes ${mesConsulta}`,
        errorType: DataErrorTypes.MISSING_DATA,
      } as ErrorResponseAPIBase);
    }

    return res.status(200).json({
      success: true,
      data: {
        Mes: mesConsulta,
        Asistencias_Escolares: asistenciasEscolares,
      },
    } as GetAsistenciasEscolaresMensualesDeMiAulaSuccessResponse);
  } catch (error) {
    console.error("Error al obtener asistencias mensuales de mi aula:", error);
    return res.status(500).json({
      success: false,
      message:
        "Error interno del servidor al obtener las asistencias de su aula",
      errorType: SystemErrorTypes.UNKNOWN_ERROR,
      details: error,
    } as ErrorResponseAPIBase);
  }
}) as any);

export default router;
