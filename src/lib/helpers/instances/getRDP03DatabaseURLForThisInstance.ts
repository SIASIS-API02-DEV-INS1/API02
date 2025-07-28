import { RDP03 } from "../../../interfaces/shared/RDP03Instancias";
import { RDP03_INSTANCES_DATABASE_URL_MAP } from "../../../constants/RDP03_INSTANCES_DISTRIBUTION";

/**
 * Obtiene la URL de conexión a la base de datos MongoDB para una instancia específica
 * @param instance La instancia de la base de datos
 * @returns La URL de conexión o null si no está definida
 */
export function getRDP03DatabaseURLForThisInstance(
  instance: RDP03
): string | null {
  // Obtener la URL de conexión directamente del mapa
  const connectionURL = RDP03_INSTANCES_DATABASE_URL_MAP.get(instance);

  if (!connectionURL) {
    console.warn(
      `No hay URL de conexión disponible para la instancia ${instance}`
    );
    return null;
  }

  return connectionURL;
}
