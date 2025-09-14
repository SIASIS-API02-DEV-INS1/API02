import { Request, Response, Router } from "express";
import { RolesSistema } from "../../../interfaces/shared/RolesSistema";

import { RolesTexto } from "../../../../assets/RolesTextosEspañol";
import { NivelEducativo } from "../../../interfaces/shared/NivelEducativo";
import {
  SystemErrorTypes,
  TokenErrorTypes,
  ValidationErrorTypes,
  UserErrorTypes,
} from "../../../interfaces/shared/errors";
import {
  ProfesorConAulaSuccessResponse,
  ProfesorConAulaErrorAPI02,
} from "../../../interfaces/shared/apis/api02/profesores-con-aula/types";
import {
  obtenerProfesorPrimaria,
  obtenerProfesorSecundaria,
} from "../../../../core/databases/queries/RDP03/profesores/buscarPorId";

const router = Router();

router.get("/", (async (req: Request, res: Response) => {
  try {
    const Rol = req.userRole!;
    const rdp03EnUso = req.RDP03_INSTANCE;

    // Verificar que el rol sea de responsable
    if (Rol !== RolesSistema.Responsable) {
      return res.status(403).json({
        success: false,
        message: `El token no corresponde a un ${
          RolesTexto[RolesSistema.Responsable].singular
        }`,
        errorType: TokenErrorTypes.TOKEN_WRONG_ROLE,
      } as ProfesorConAulaErrorAPI02);
    }

    // Obtener parámetros de consulta
    const { Id_Profesor, Nivel } = req.query;

    // Validar parámetros obligatorios
    if (!Id_Profesor || typeof Id_Profesor !== "string") {
      return res.status(400).json({
        success: false,
        message:
          "El parámetro Id_Profesor es obligatorio y debe ser una cadena válida",
        errorType: ValidationErrorTypes.REQUIRED_FIELDS,
      } as ProfesorConAulaErrorAPI02);
    }

    if (!Nivel || typeof Nivel !== "string") {
      return res.status(400).json({
        success: false,
        message:
          "El parámetro Nivel es obligatorio y debe ser una cadena válida",
        errorType: ValidationErrorTypes.REQUIRED_FIELDS,
      } as ProfesorConAulaErrorAPI02);
    }

    // Validar que el Nivel sea válido
    if (
      ![NivelEducativo.PRIMARIA, NivelEducativo.SECUNDARIA].includes(
        Nivel as any
      )
    ) {
      return res.status(400).json({
        success: false,
        message: `El Nivel debe ser "${NivelEducativo.PRIMARIA}" para primaria o "${NivelEducativo.SECUNDARIA}" para secundaria`,
        errorType: ValidationErrorTypes.INVALID_ENUM_VALUE,
      } as ProfesorConAulaErrorAPI02);
    }

    let profesor;

    // Consultar según el Nivel educativo
    if (Nivel === NivelEducativo.PRIMARIA) {
      profesor = await obtenerProfesorPrimaria(Id_Profesor, rdp03EnUso!);
    } else if (Nivel === NivelEducativo.SECUNDARIA) {
      profesor = await obtenerProfesorSecundaria(Id_Profesor, rdp03EnUso!);
    }

    // Verificar si se encontró el profesor
    if (!profesor) {
      return res.status(404).json({
        success: false,
        message: `No se encontró ningún profesor ${
          Nivel === NivelEducativo.PRIMARIA ? "de primaria" : "de secundaria"
        } con el ID proporcionado o el profesor no está activo`,
        errorType: UserErrorTypes.USER_NOT_FOUND,
      } as ProfesorConAulaErrorAPI02);
    }

    return res.status(200).json({
      success: true,
      data: profesor,
    } as ProfesorConAulaSuccessResponse);
  } catch (error) {
    console.error("Error al obtener datos del profesor:", error);
    return res.status(500).json({
      success: false,
      message: "Error interno del servidor al obtener los datos del profesor",
      errorType: SystemErrorTypes.UNKNOWN_ERROR,
      details: error,
    } as ProfesorConAulaErrorAPI02);
  }
}) as any);

export default router;
