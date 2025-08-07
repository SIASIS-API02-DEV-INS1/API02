import { Request, Response, Router } from "express";
import { RolesSistema } from "../../../interfaces/shared/RolesSistema";
import { ResponsableAuthenticated } from "../../../interfaces/shared/JWTPayload";
import { RolesTexto } from "../../../../assets/RolesTextosEspañol";
import {
  SystemErrorTypes,
  TokenErrorTypes,
} from "../../../interfaces/shared/errors";
import { obtenerEstudiantesRelacionadosParaResponsable } from "../../../../core/databases/queries/RDP03/estudiantes/obtenerEstudiantesRelacionadosParaResponsable";
import { EstudianteDelResponsable, MisEstudiantesRelacionadosErrorResponseAPI02, MisEstudiantesRelacionadosSuccessResponseAPI02 } from "../../../interfaces/shared/apis/api02/mis-estudiantes-relacionados/types";

const router = Router();


// Ruta para obtener todos los estudiantes relacionados al responsable
router.get("/", (async (req: Request, res: Response) => {
  try {
    const Rol = req.userRole!;
    const userData = req.user! as ResponsableAuthenticated;
    const rdp03EnUso = req.RDP03_INSTANCE;

    // Verificar que el rol sea de responsable
    if (Rol !== RolesSistema.Responsable) {
      return res.status(403).json({
        success: false,
        message: `El token no corresponde a un ${
          RolesTexto[RolesSistema.Responsable].singular
        }`,
        errorType: TokenErrorTypes.TOKEN_WRONG_ROLE,
      } as MisEstudiantesRelacionadosErrorResponseAPI02);
    }

    // Obtener estudiantes relacionados al responsable usando MongoDB
    const estudiantes = await obtenerEstudiantesRelacionadosParaResponsable(
      userData.Id_Responsable,
      rdp03EnUso
    );

    // Transformar la respuesta para usar Id_Estudiante en lugar de Id_Estudiante
    const estudiantesTransformados: EstudianteDelResponsable[] = estudiantes.map(
      (estudiante) => ({
        Id_Estudiante: estudiante.Id_Estudiante, // Mapear Id_Estudiante a Id_Estudiante
        Nombres: estudiante.Nombres,
        Apellidos: estudiante.Apellidos,
        Estado: estudiante.Estado,
        Id_Aula: estudiante.Id_Aula,
        Tipo_Relacion: estudiante.Tipo_Relacion,
        // Si existe Google_Drive_Foto_ID en la consulta, incluirlo
        Google_Drive_Foto_ID: (estudiante as any).Google_Drive_Foto_ID || null,
      })
    );

    return res.status(200).json({
      success: true,
      data: estudiantesTransformados,
      total: estudiantesTransformados.length,
    } as MisEstudiantesRelacionadosSuccessResponseAPI02);
  } catch (error) {
    console.error("Error al obtener estudiantes del responsable:", error);
    return res.status(500).json({
      success: false,
      message: "Error al obtener los estudiantes relacionados",
      errorType: SystemErrorTypes.UNKNOWN_ERROR,
      details: error,
    } as MisEstudiantesRelacionadosErrorResponseAPI02);
  }
}) as any);

export default router;