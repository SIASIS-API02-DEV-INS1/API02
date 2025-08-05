// src/routes/responsable/mi-foto-perfil/index.ts
import { Request, Response, Router } from "express";
import multer from "multer";
import { ErrorResponseAPIBase } from "../../../../interfaces/shared/apis/types";
import {
  RequestErrorTypes,
  SystemErrorTypes,
} from "../../../../interfaces/shared/errors";
import { subirFotoPerfil } from "../../../../lib/helpers/functions/subirFotoPerfil";
import { RolesSistema } from "../../../../interfaces/shared/RolesSistema";
import { ResponsableAuthenticated } from "../../../../interfaces/shared/JWTPayload";

const router = Router();

// Configuración de multer para manejar archivos
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB máximo
  },
  fileFilter: (req, file, cb) => {
    // Validar tipo de archivo
    const allowedMimeTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/webp",
    ];
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new Error(
          "Tipo de archivo no permitido. Solo se permiten: JPEG, JPG, PNG, WEBP"
        )
      );
    }
  },
});

/**
 * POST / - Subir foto de perfil propia del responsable
 */
router.put("/", upload.single("foto"), (async (req: Request, res: Response) => {
  try {
    const rdp03EnUso = req.RDP03_INSTANCE!;
    const file = req.file;
    const userData = req.user!;
    const Rol = req.userRole!;

    // Validar que se subió un archivo
    if (!file) {
      return res.status(400).json({
        success: false,
        message: "No se ha proporcionado ningún archivo de imagen",
        errorType: RequestErrorTypes.MISSING_PARAMETERS,
      } as ErrorResponseAPIBase);
    }
    // Obtener el identificador según el rol
    let identificador: string | number;
    switch (Rol) {
      case RolesSistema.Responsable:
        identificador = (userData as ResponsableAuthenticated).Id_Responsable;

        break;

      default:
        return res.status(400).json({
          success: false,
          message: "Rol no soportado",
          errorType: RequestErrorTypes.INVALID_PARAMETERS,
        } as ErrorResponseAPIBase);
    }

    // Nombre de archivo opcional del body
    const { nombreArchivo } = req.body;

    // Subir foto propia (Solo para Responsables)
    const resultado = await subirFotoPerfil(
      rdp03EnUso,
      RolesSistema.Responsable,
      file,
      identificador,
      nombreArchivo
    );

    if (!resultado.success) {
      return res.status(400).json({
        success: false,
        message: resultado.message,
        errorType: resultado.errorType,
      } as ErrorResponseAPIBase);
    }

    return res.status(200).json({
      success: true,
      message: resultado.message,
      data: {
        fileId: resultado.fileId,
        fileUrl: resultado.fileUrl,
      },
    });
  } catch (error) {
    console.error("Error al subir foto de perfil:", error);

    // Manejar errores específicos de multer
    if (error instanceof multer.MulterError) {
      if (error.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({
          success: false,
          message: "El archivo es demasiado grande. Máximo 5MB permitido",
          errorType: RequestErrorTypes.INVALID_PARAMETERS,
        } as ErrorResponseAPIBase);
      }
    }

    // Error de tipo de archivo
    if (
      (error as Error).message &&
      (error as Error).message.includes("Tipo de archivo no permitido")
    ) {
      return res.status(400).json({
        success: false,
        message: (error as Error).message,
        errorType: RequestErrorTypes.INVALID_PARAMETERS,
      } as ErrorResponseAPIBase);
    }

    return res.status(500).json({
      success: false,
      message: "Error interno del servidor al subir la foto",
      errorType: SystemErrorTypes.UNKNOWN_ERROR,
      details: error,
    } as ErrorResponseAPIBase);
  }
}) as any);

export default router;
