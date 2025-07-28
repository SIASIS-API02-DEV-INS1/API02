import { ErrorResponseAPIBase } from "../../../../../interfaces/shared/apis/types";
import {
  DataConflictErrorTypes,
  RequestErrorTypes,
  SystemErrorTypes,
  ValidationErrorTypes,
} from "../../../../../interfaces/shared/errors";

/**
 * Interfaz para respuesta de error manejado
 */
export interface HandledErrorResponse {
  status: number;
  response: ErrorResponseAPIBase;
}

/**
 * Interfaz para mapeo de nombres de campos
 */
export interface FriendlyFieldNames {
  [key: string]: string;
}

/**
 * Maneja errores específicos de MongoDB
 * @param error Error capturado
 * @param friendlyFieldNames Mapeo de nombres técnicos a nombres amigables
 * @returns Objeto con status y response si se pudo manejar, null si no se reconoce el error
 */
export function handleMongoError(
  error: any,
  friendlyFieldNames: FriendlyFieldNames
): HandledErrorResponse | null {
  // Error de clave duplicada en MongoDB (E11000)
  if (
    error.code === 11000 ||
    (error.name === "MongoServerError" &&
      error.message?.includes("duplicate key"))
  ) {
    return handleMongoDuplicateKeyError(error, friendlyFieldNames);
  }

  // Error de validación de MongoDB
  if (error.name === "ValidationError") {
    return handleMongoValidationError(error);
  }

  // Errores de conexión a MongoDB
  if (
    error.name === "MongoNetworkError" ||
    error.name === "MongoTimeoutError" ||
    error.name === "MongoServerSelectionError"
  ) {
    return handleMongoConnectionError(error);
  }

  // Error de operación MongoDB (operaciones no válidas, etc.)
  if (error.name === "MongoInvalidArgumentError") {
    return handleMongoInvalidArgumentError(error);
  }

  // Error de autenticación MongoDB
  if (error.name === "MongoAuthenticationError") {
    return handleMongoAuthenticationError(error);
  }

  // Error de parsing/formato de MongoDB
  if (error.name === "MongoBSONError" || error.name === "BSONError") {
    return handleMongoBSONError(error);
  }

  // No se pudo manejar el error
  return null;
}

/**
 * Maneja errores de clave duplicada en MongoDB
 */
function handleMongoDuplicateKeyError(
  error: any,
  friendlyFieldNames: FriendlyFieldNames
): HandledErrorResponse {
  // Extraer el campo que causó el error de diferentes patrones posibles
  let fieldName = "campo";

  // Patrón 1: index: fieldName_1
  const indexMatch = error.message?.match(/index: (\w+)_1/);
  if (indexMatch) {
    fieldName = indexMatch[1];
  } else {
    // Patrón 2: key: { fieldName: "value" }
    const keyMatch = error.message?.match(/key: \{ (\w+):/);
    if (keyMatch) {
      fieldName = keyMatch[1];
    } else {
      // Patrón 3: collection.fieldName
      const collectionMatch = error.message?.match(
        /collection\.\w+\s+.*?(\w+):/
      );
      if (collectionMatch) {
        fieldName = collectionMatch[1];
      }
    }
  }

  const friendlyName = friendlyFieldNames[fieldName] || fieldName;

  return {
    status: 409,
    response: {
      success: false,
      message: `El ${friendlyName} ya está en uso`,
      errorType: DataConflictErrorTypes.VALUE_ALREADY_IN_USE,
      details: {
        field: fieldName,
        friendlyName: friendlyName,
        errorCode: error.code,
        mongoError: error.message,
      },
    },
  };
}

/**
 * Maneja errores de validación de MongoDB
 */
function handleMongoValidationError(error: any): HandledErrorResponse {
  return {
    status: 400,
    response: {
      success: false,
      message: "Error de validación en los datos proporcionados",
      errorType: ValidationErrorTypes.VALIDATION_ERROR,
      details: {
        validationErrors: error.errors || error.message,
        mongoError: error.message,
      },
    },
  };
}

/**
 * Maneja errores de conexión a MongoDB
 */
function handleMongoConnectionError(error: any): HandledErrorResponse {
  let message = "Error de conexión con la base de datos";
  let details = "Servicio temporalmente no disponible";

  if (error.name === "MongoServerSelectionError") {
    message = "No se pudo conectar al servidor de base de datos";
    details = "Verifique la conectividad de red";
  } else if (error.name === "MongoTimeoutError") {
    message = "Timeout en la conexión a la base de datos";
    details = "La operación tardó demasiado en completarse";
  }

  return {
    status: 503,
    response: {
      success: false,
      message: message,
      errorType: SystemErrorTypes.DATABASE_ERROR,
      details: {
        errorType: error.name,
        mongoError: error.message,
        suggestion: details,
      },
    },
  };
}

/**
 * Maneja errores de argumentos inválidos en MongoDB
 */
function handleMongoInvalidArgumentError(error: any): HandledErrorResponse {
  return {
    status: 400,
    response: {
      success: false,
      message: "Argumentos inválidos en la operación de base de datos",
      errorType: RequestErrorTypes.INVALID_PARAMETERS,
      details: {
        mongoError: error.message,
        suggestion: "Verifique los parámetros enviados",
      },
    },
  };
}

/**
 * Maneja errores de autenticación en MongoDB
 */
function handleMongoAuthenticationError(error: any): HandledErrorResponse {
  return {
    status: 503,
    response: {
      success: false,
      message: "Error de autenticación con la base de datos",
      errorType: SystemErrorTypes.DATABASE_ERROR,
      details: {
        mongoError: "Authentication failed",
        suggestion: "Error de configuración del servidor",
      },
    },
  };
}

/**
 * Maneja errores de BSON/parsing en MongoDB
 */
function handleMongoBSONError(error: any): HandledErrorResponse {
  return {
    status: 400,
    response: {
      success: false,
      message: "Error en el formato de los datos",
      errorType: ValidationErrorTypes.INVALID_FORMAT,
      details: {
        mongoError: error.message,
        suggestion: "Verifique el formato de los datos enviados",
      },
    },
  };
}

/**
 * Función auxiliar para extraer información específica de errores de MongoDB
 * @param error Error de MongoDB
 * @returns Información estructurada del error
 */
export function extractMongoErrorInfo(error: any): {
  code?: number;
  name: string;
  message: string;
  isOperational: boolean;
} {
  return {
    code: error.code,
    name: error.name || "UnknownMongoError",
    message: error.message || "Error desconocido de MongoDB",
    isOperational: [
      "MongoNetworkError",
      "MongoTimeoutError",
      "MongoServerSelectionError",
      "ValidationError",
    ].includes(error.name),
  };
}

/**
 * Función para logging específico de errores MongoDB
 * @param error Error original
 * @param context Contexto donde ocurrió el error
 */
export function logMongoError(error: any, context: string): void {
  const errorInfo = extractMongoErrorInfo(error);

  console.error(`MongoDB Error in ${context}:`, {
    name: errorInfo.name,
    code: errorInfo.code,
    message: errorInfo.message,
    isOperational: errorInfo.isOperational,
    timestamp: new Date().toISOString(),
    stack: error.stack,
  });
}
