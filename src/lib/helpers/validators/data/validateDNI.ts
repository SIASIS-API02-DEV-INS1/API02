import { ValidationErrorTypes } from "../../../../interfaces/shared/errors";
import { ValidationResult } from "./types";

/**
 * Valida un Id peruano
 * @param value - Valor a validar
 * @param required - Indica si el campo es obligatorio
 * @returns Resultado de la validación
 */
export function validateId(value: any, required: boolean): ValidationResult {
    if ((value === undefined || value === null) && required) {
      return {
        isValid: false,
        errorType: ValidationErrorTypes.FIELD_REQUIRED,
        errorMessage: "El Id es requerido"
      };
    }
    
    if (value === undefined || value === null) {
      return { isValid: true };
    }
    
    if (typeof value !== 'string') {
      return {
        isValid: false,
        errorType: ValidationErrorTypes.INVALID_FORMAT,
        errorMessage: "El Id debe ser una cadena de texto"
      };
    }
    
    const idRegex = /^\d{8}$/;
    if (!idRegex.test(value)) {
      return {
        isValid: false,
        errorType: ValidationErrorTypes.INVALID_Id,
        errorMessage: "El Id debe contener exactamente 8 dígitos numéricos"
      };
    }
    
    return { isValid: true };
  }
  