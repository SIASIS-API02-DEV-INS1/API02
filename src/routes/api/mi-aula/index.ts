import { Request, Response, Router } from "express";
import { RolesSistema } from "../../../interfaces/shared/RolesSistema";
import { RolesTexto } from "../../../../assets/RolesTextosEspañol";
import {
  DataErrorTypes,
  SystemErrorTypes,
  TokenErrorTypes,
} from "../../../interfaces/shared/errors";
import { ErrorResponseAPIBase } from "../../../interfaces/shared/apis/types";
import {
  ProfesorPrimariaAuthenticated,
  ProfesorTutorSecundariaAuthenticated,
} from "../../../interfaces/shared/JWTPayload";
import { obtenerAulaDelProfesor } from "../../../../core/databases/queries/RDP03/aulas/obtenerAulaDelProfesor";
import { GetMiAulaSuccessResponse } from "../../../interfaces/shared/apis/api02/mi-aula/types";
import AsistenciasEscolaresMensualesDeMiAulaRouter from "./asistencias-escolares-mensuales";

const router = Router();

router.get("/", (async (req: Request, res: Response) => {
  try {
    const Rol = req.userRole!;
    const userData = req.user!;
    const rdp03EnUso = req.RDP03_INSTANCE!;

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

    return res.status(200).json({
      success: true,
      data: miAula,
    } as GetMiAulaSuccessResponse);
  } catch (error) {
    console.error("Error al obtener mi aula:", error);
    return res.status(500).json({
      success: false,
      message: "Error interno del servidor al obtener los datos del aula",
      errorType: SystemErrorTypes.UNKNOWN_ERROR,
      details: error,
    } as ErrorResponseAPIBase);
  }
}) as any);

router.use(
  "/asistencias-escolares-mensuales",
  AsistenciasEscolaresMensualesDeMiAulaRouter
);

export default router;
