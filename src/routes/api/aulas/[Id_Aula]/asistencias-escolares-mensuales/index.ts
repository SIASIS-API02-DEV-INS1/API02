import { Request, Response, Router } from "express";
import isDirectivoAuthenticated from "../../../../../middlewares/isDirectivoAuthenticated";
import isAuxiliarAuthenticated from "../../../../../middlewares/isAuxiliarAuthenticated";
import checkAuthentication from "../../../../../middlewares/checkAuthentication";
import { RolesSistema } from "../../../../../interfaces/shared/RolesSistema";
import { RolesTexto } from "../../../../../../assets/RolesTextosEspañol";
import { ErrorResponseAPIBase } from "../../../../../interfaces/shared/apis/types";
import {
  DataErrorTypes,
  RequestErrorTypes,
  SystemErrorTypes,
  TokenErrorTypes,
  ValidationErrorTypes,
} from "../../../../../interfaces/shared/errors";
import { NivelEducativo } from "../../../../../interfaces/shared/NivelEducativo";
import {
  CONTROL_ASISTENCIA_DE_SALIDA_PRIMARIA,
  CONTROL_ASISTENCIA_DE_SALIDA_SECUNDARIA,
} from "../../../../../constants/ASISTENCIA_ENTRADA_SALIDA_ESCOLAR";
import { obtenerDatosAula } from "../../../../../../core/databases/queries/RDP03/aulas/obtenerDatosDeAula";
import { obtenerTablaAsistenciasEscolaresPorNivelYGrado } from "../../../../../lib/utils/obtenerTablaAsistenciasEscolaresPorNivelYGrado";
import { obtenerAsistenciasMensualesDeAula } from "../../../../../../core/databases/queries/RDP03/aulas/obtenerAsistenciasMensualesDeAula";
import { parsearAsistenciasEscolares } from "../../../../../lib/utils/parsearAsistenciasEscolares";
import { GetAsistenciasMensualesDeUnAulaSuccessResponse } from "../../../../../interfaces/shared/apis/api02/aulas/asistencias-escolares-mensuales/types";

const router = Router();

router.get(
  "/:Id_Aula/asistencias-escolares-mensuales",
  isDirectivoAuthenticated,
  isAuxiliarAuthenticated,
  checkAuthentication,
  (async (req: Request, res: Response) => {
    try {
      const { Id_Aula } = req.params;
      const Rol = req.userRole!;
      const rdp03EnUso = req.RDP03_INSTANCE;

      // Verificar que el rol sea Directivo o Auxiliar
      if (![RolesSistema.Directivo, RolesSistema.Auxiliar].includes(Rol)) {
        return res.status(403).json({
          success: false,
          message: `El token no corresponde a un ${
            RolesTexto[RolesSistema.Directivo].singular
          } o ${RolesTexto[RolesSistema.Auxiliar].singular}`,
          errorType: TokenErrorTypes.TOKEN_WRONG_ROLE,
        } as ErrorResponseAPIBase);
      }

      // Validar parámetro Id_Aula
      if (!Id_Aula) {
        return res.status(400).json({
          success: false,
          message: "El ID del aula es requerido",
          errorType: ValidationErrorTypes.REQUIRED_FIELDS,
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

      // Obtener datos del aula (nivel, grado, sección)
      const datosAula = await obtenerDatosAula(Id_Aula, rdp03EnUso);

      if (!datosAula) {
        return res.status(404).json({
          success: false,
          message: "El aula especificada no fue encontrada",
          errorType: DataErrorTypes.MISSING_DATA,
        } as ErrorResponseAPIBase);
      }

      // Verificar permisos según rol
      if (
        Rol === RolesSistema.Auxiliar &&
        datosAula.Nivel !== NivelEducativo.SECUNDARIA
      ) {
        return res.status(403).json({
          success: false,
          message:
            "Los auxiliares solo tienen acceso a aulas de nivel secundaria",
          errorType: TokenErrorTypes.TOKEN_UNAUTHORIZED,
        } as ErrorResponseAPIBase);
      }

      // Determinar la tabla de asistencias correcta
      const tablaAsistencias = obtenerTablaAsistenciasEscolaresPorNivelYGrado(
        datosAula.Nivel as NivelEducativo,
        datosAula.Grado
      );

      // Determinar si incluir salidas según el nivel del aula
      const incluirSalidas =
        datosAula.Nivel === NivelEducativo.PRIMARIA
          ? CONTROL_ASISTENCIA_DE_SALIDA_PRIMARIA
          : CONTROL_ASISTENCIA_DE_SALIDA_SECUNDARIA;

      // Obtener las asistencias mensuales de todos los estudiantes del aula
      const asistenciasRaw = await obtenerAsistenciasMensualesDeAula(
        Id_Aula,
        tablaAsistencias,
        mesConsulta,
        rdp03EnUso
      );

      if (!asistenciasRaw || asistenciasRaw.length === 0) {
        return res.status(404).json({
          success: false,
          message: `No se encontraron registros de asistencia para el aula en el mes ${mesConsulta}`,
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
          message: `No se encontraron asistencias válidas para el aula en el mes ${mesConsulta}`,
          errorType: DataErrorTypes.MISSING_DATA,
        } as ErrorResponseAPIBase);
      }

      return res.status(200).json({
        success: true,
        data: {
          Mes: mesConsulta,
          Asistencias_Escolares: asistenciasEscolares,
        },
      } as GetAsistenciasMensualesDeUnAulaSuccessResponse);
    } catch (error) {
      console.error("Error al obtener asistencias mensuales del aula:", error);
      return res.status(500).json({
        success: false,
        message:
          "Error interno del servidor al obtener las asistencias del aula",
        errorType: SystemErrorTypes.UNKNOWN_ERROR,
        details: error,
      } as ErrorResponseAPIBase);
    }
  }) as any
);

export default router;
