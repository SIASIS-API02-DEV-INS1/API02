import { Request, Response, Router } from "express";
import { RolesSistema } from "../../../interfaces/shared/RolesSistema";
import { ResponsableAuthenticated } from "../../../interfaces/shared/JWTPayload";
import { RolesTexto } from "../../../../assets/RolesTextosEspañol";

import { validatePhone } from "../../../lib/helpers/validators/data/validateCelular";
import { ValidatorConfig } from "../../../lib/helpers/validators/data/types";
import { validateData } from "../../../lib/helpers/validators/data/validateData";
import { ErrorResponseAPIBase } from "../../../interfaces/shared/apis/types";
import miContraseñaRouter from "./mi-contrasena";
import miFotoDePerfilRouter from "./mi-foto-perfil";
import {
  RequestErrorTypes,
  SystemErrorTypes,
  TokenErrorTypes,
  UserErrorTypes,
} from "../../../interfaces/shared/errors";

import { actualizarseResponsable } from "../../../../core/databases/queries/RDP03/responsables/actualizarseResponsable";
import { handleMongoError } from "../../../lib/helpers/handlers/errors/mongoDB";
import { ActualizarUsuarioSuccessResponseAPI02, MisDatosErrorResponseAPI02, MisDatosResponsable, MisDatosSuccessResponseAPI02 } from "../../../interfaces/shared/apis/api02/mis-datos/types";
import { buscarResponsablePorIdSelect } from "../../../../core/databases/queries/RDP03/responsables/buscarResponsablePorId";



const router = Router();

// Ruta para obtener los datos personales del responsable
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
      });
    }

    // Buscar el responsable por Id con campos específicos usando MongoDB
    const responsable = await buscarResponsablePorIdSelect(
      userData.Id_Responsable,
      [
        "Id_Responsable",
        "Nombres",
        "Apellidos",
        "Nombre_Usuario",
        "Celular",
        "Google_Drive_Foto_ID",
      ],
      rdp03EnUso
    );

    if (!responsable) {
      return res.status(404).json({
        success: false,
        message: "Usuario no encontrado",
        errorType: UserErrorTypes.USER_NOT_FOUND,
      });
    }

    // Estructurar los datos según la interfaz esperada
    const misDatos: MisDatosResponsable = {
      Id_Responsable: responsable.Id_Responsable,
      Nombres: responsable.Nombres,
      Apellidos: responsable.Apellidos,
      Nombre_Usuario: responsable.Nombre_Usuario,
      Celular: responsable.Celular,
      Google_Drive_Foto_ID: responsable.Google_Drive_Foto_ID,
    };

    return res.status(200).json({
      success: true,
      data: misDatos,
    } as MisDatosSuccessResponseAPI02);
  } catch (error) {
    console.error("Error al obtener datos del responsable:", error);
    return res.status(500).json({
      success: false,
      message: "Error al obtener los datos del usuario",
      errorType: SystemErrorTypes.UNKNOWN_ERROR,
      details: error,
    } as MisDatosErrorResponseAPI02);
  }
}) as any);

// Ruta para actualizar parcialmente los datos personales del responsable
router.put("/", (async (req: Request, res: Response) => {
  try {
    const Rol = req.userRole!;
    const userData = req.user! as ResponsableAuthenticated;
    const updateData = req.body;
    const rdp03EnUso = req.RDP03_INSTANCE; // Nota: Necesitarás actualizar esto en tu JWT payload

    // Verificar que el rol sea de responsable
    if (Rol !== RolesSistema.Responsable) {
      return res.status(403).json({
        success: false,
        message: `El token no corresponde a un ${
          RolesTexto[RolesSistema.Responsable].singular
        }`,
        errorType: TokenErrorTypes.TOKEN_WRONG_ROLE,
      });
    }

    // Verificar que se ha enviado al menos un campo para actualizar
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        message: "Debe proporcionar al menos un campo para actualizar",
        errorType: RequestErrorTypes.INVALID_PARAMETERS,
      });
    }

    // Configurar validadores específicos para responsables
    // Los responsables solo pueden actualizar su celular
    const validators: ValidatorConfig[] = [
      { field: "Celular", validator: validatePhone },
    ];

    // Filtrar solo los campos permitidos para responsables
    const allowedFields = validators.map((v) => v.field);
    let updatedFields: any = {};

    for (const key in updateData) {
      if (allowedFields.includes(key)) {
        updatedFields[key] = updateData[key];
      }
    }

    // Verificar que hay al menos un campo válido para actualizar
    if (Object.keys(updatedFields).length === 0) {
      return res.status(400).json({
        success: false,
        message: `No se proporcionaron campos válidos para actualizar. Campos permitidos: ${allowedFields.join(
          ", "
        )}`,
        errorType: RequestErrorTypes.INVALID_PARAMETERS,
      });
    }

    // Validar los datos usando la función validateData
    const validationResult = validateData(updatedFields, validators);
    if (!validationResult.isValid) {
      return res.status(400).json({
        success: false,
        message: validationResult.errorMessage,
        errorType: validationResult.errorType,
      });
    }

    // Actualizar el responsable usando MongoDB
    const updated = await actualizarseResponsable(
      userData.Id_Responsable,
      updatedFields,
      rdp03EnUso
    );

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: "Usuario no encontrado o no se pudo actualizar",
        errorType: UserErrorTypes.USER_NOT_FOUND,
      });
    }

    return res.status(200).json({
      success: true,
      message: "Datos actualizados correctamente",
      data: updatedFields, // Solo devolvemos los campos que realmente se actualizaron
    } as ActualizarUsuarioSuccessResponseAPI02);
  } catch (error) {
    console.error("Error al actualizar datos del responsable:", error);

    // Intentar manejar el error con la función específica para errores MongoDB
    const handledError = handleMongoError(error, {
      Id_Responsable: "Id",
      Nombre_Usuario: "nombre de usuario",
      Celular: "celular",
    });

    if (handledError) {
      return res.status(handledError.status).json(handledError.response);
    }

    // Si no fue manejado, devolver un error genérico
    return res.status(500).json({
      success: false,
      message: "Error al actualizar los datos del usuario",
      errorType: SystemErrorTypes.UNKNOWN_ERROR,
      details: error,
    } as ErrorResponseAPIBase);
  }
}) as any);

// Mantener los sub-routers para funcionalidades relacionadas
router.use("/mi-contrasena", miContraseñaRouter);
router.use("/mi-foto-perfil", miFotoDePerfilRouter);

export default router;
