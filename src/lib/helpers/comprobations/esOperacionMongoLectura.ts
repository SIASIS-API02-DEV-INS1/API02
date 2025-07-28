/**
 * Detecta si una operación MongoDB es de lectura o escritura
 * @param operation Tipo de operación MongoDB
 * @returns true si es una operación de lectura, false si es de escritura
 */
export function esOperacionMongoLectura(operation: string): boolean {
  const readOperations = [
    "find",
    "findOne",
    "aggregate",
    "countDocuments",
    "estimatedDocumentCount",
    "distinct",
    "findOneAndDelete", // Aunque modifica, retorna el documento antes de eliminar
    "findOneAndReplace", // Aunque modifica, retorna el documento antes de reemplazar
    "findOneAndUpdate", // Aunque modifica, retorna el documento antes/después de actualizar
  ];

  // Las operaciones findOneAnd* las consideramos de escritura para propósitos de replicación
  const writeOperationsExceptions = [
    "findOneAndDelete",
    "findOneAndReplace",
    "findOneAndUpdate",
  ];

  // Si está en las excepciones, es escritura
  if (writeOperationsExceptions.includes(operation)) {
    return false;
  }

  // Si está en las operaciones de lectura, es lectura
  return readOperations.includes(operation);
}
