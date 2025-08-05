// src/routes/auth/mis-datos/mi-contrasena/index.ts
import { Request, Response, Router } from "express";
import { ErrorResponseAPIBase } from "../../../../interfaces/shared/apis/types";

import { RolesSistema } from "../../../../interfaces/shared/RolesSistema";
import {
  SystemErrorTypes,
  TokenErrorTypes,
  UserErrorTypes,
  ValidationErrorTypes,
} from "../../../../interfaces/shared/errors";
import { RolesTexto } from "../../../../../assets/RolesTextosEspañol";
import { ResponsableAuthenticated } from "../../../../interfaces/shared/JWTPayload";
import {
  encryptResponsablePassword,
  verifyResponsablePassword,
} from "../../../../lib/helpers/encriptations/responsable.encriptation";
import {
  validateCurrentPassword,
  validatePassword,
} from "../../../../lib/helpers/validators/data/validatePassword";
import { ValidatorConfig } from "../../../../lib/helpers/validators/data/types";
import { validateData } from "../../../../lib/helpers/validators/data/validateData";
import {
  CambiarContraseñaRequestBody,
  CambiarContraseñaSuccessResponse,
} from "../../../../interfaces/shared/apis/shared/mis-datos/mi-contraseña/types";

import { handleMongoError } from "../../../../lib/helpers/handlers/errors/mongoDB";
import { buscarContraseñaResponsable } from "../../../../../core/databases/queries/RDP03/responsables/buscarContraseñaResponsable";
import { actualizarContraseñaResponsable } from "../../../../../core/databases/queries/RDP03/responsables/actualizarContraseñaResponsable";

const router = Router();

router.put("/", (async (req: Request, res: Response) => {
  try {
    const Rol = req.userRole!;
    const rdp03EnUso = req.RDP03_INSTANCE; // Cambio de RDP02 a RDP03
    const userData = req.user!;
    const { contraseñaActual, nuevaContraseña } =
      req.body as CambiarContraseñaRequestBody;

    // Verificar que el rol sea Responsable
    if (Rol !== RolesSistema.Responsable) {
      return res.status(403).json({
        success: false,
        message: `Esta funcionalidad solo está disponible para ${
          RolesTexto[RolesSistema.Responsable].plural
        }`,
        errorType: TokenErrorTypes.TOKEN_WRONG_ROLE,
      } as ErrorResponseAPIBase);
    }

    // Configurar validadores para las contraseñas
    const validators: ValidatorConfig[] = [
      { field: "contraseñaActual", validator: validateCurrentPassword },
      { field: "nuevaContraseña", validator: validatePassword },
    ];

    // Validar contraseñas
    const validationResult = validateData(
      { contraseñaActual, nuevaContraseña },
      validators
    );

    if (!validationResult.isValid) {
      return res.status(400).json({
        success: false,
        message: validationResult.errorMessage,
        errorType: validationResult.errorType,
      } as ErrorResponseAPIBase);
    }

    // Verificar que la nueva contraseña no sea igual a la actual
    if (contraseñaActual === nuevaContraseña) {
      return res.status(400).json({
        success: false,
        message:
          "La nueva contraseña no puede ser igual a la contraseña actual",
        errorType: ValidationErrorTypes.INVALID_FORMAT,
      } as ErrorResponseAPIBase);
    }

    // Obtener la contraseña actual del responsable desde MongoDB
    const contraseñaAlmacenada = await buscarContraseñaResponsable(
      (userData as ResponsableAuthenticated).Id_Responsable,
      rdp03EnUso
    );

    if (!contraseñaAlmacenada) {
      return res.status(404).json({
        success: false,
        message: "Responsable no encontrado",
        errorType: UserErrorTypes.USER_NOT_FOUND,
      } as ErrorResponseAPIBase);
    }

    // Verificar si la contraseña actual es válida
    const contraseñaActualValida = verifyResponsablePassword(
      contraseñaActual,
      contraseñaAlmacenada
    );

    if (!contraseñaActualValida) {
      return res.status(401).json({
        success: false,
        message: "La contraseña actual no es correcta",
        errorType: UserErrorTypes.INVALID_CREDENTIALS,
      } as ErrorResponseAPIBase);
    }

    // Encriptar la nueva contraseña
    const contraseñaEncriptada = encryptResponsablePassword(nuevaContraseña);

    // Actualizar la contraseña en MongoDB
    const actualizacionExitosa = await actualizarContraseñaResponsable(
      (userData as ResponsableAuthenticated).Id_Responsable,
      contraseñaEncriptada,
      rdp03EnUso
    );

    if (!actualizacionExitosa) {
      return res.status(500).json({
        success: false,
        message: "Error al actualizar la contraseña",
        errorType: SystemErrorTypes.DATABASE_ERROR,
      } as ErrorResponseAPIBase);
    }

    return res.status(200).json({
      success: true,
      message: "Contraseña actualizada correctamente",
    } as CambiarContraseñaSuccessResponse);
  } catch (error) {
    console.error("Error al cambiar la contraseña del responsable:", error);

    // Intentar manejar el error con la función específica para errores de MongoDB
    const handledError = handleMongoError(error, {
      Id_Responsable: "Id del responsable",
      Nombre_Usuario: "nombre de usuario",
    });

    if (handledError) {
      return res.status(handledError.status).json(handledError.response);
    }

    // Si no fue manejado, devolver un error genérico
    return res.status(500).json({
      success: false,
      message: "Error al cambiar la contraseña",
      errorType: SystemErrorTypes.UNKNOWN_ERROR,
    } as ErrorResponseAPIBase);
  }
}) as any);

export default router;
