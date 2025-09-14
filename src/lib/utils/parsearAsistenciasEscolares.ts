import { AsistenciaEscolarDeUnDia } from "../../interfaces/shared/AsistenciasEscolares";
import { ModoRegistro } from "../../interfaces/shared/ModoRegistroPersonal";

/**
 * Parsea las asistencias del string JSON y las convierte al formato requerido
 * Ahora maneja días con valor null (estado inactivo)
 */
export function parsearAsistenciasEscolares(
  asistenciasString: string,
  incluirSalidas: boolean
): Record<number, AsistenciaEscolarDeUnDia | null> {
  try {
    const asistencias = JSON.parse(asistenciasString);
    const resultado: Record<number, AsistenciaEscolarDeUnDia | null> = {};

    for (const [dia, registros] of Object.entries(asistencias)) {
      const diaNumero = parseInt(dia);

      // NUEVO: Manejar caso de día inactivo (valor null)
      if (registros === null) {
        resultado[diaNumero] = null;
        continue;
      }

      // Procesar día con datos (lógica existente)
      const registrosAsistencia = registros as any;

      const asistenciaDia: AsistenciaEscolarDeUnDia = {
        [ModoRegistro.Entrada]: null,
      };

      // Siempre incluir entrada si existe
      if (registrosAsistencia[ModoRegistro.Entrada]) {
        asistenciaDia[ModoRegistro.Entrada] = {
          DesfaseSegundos:
            registrosAsistencia[ModoRegistro.Entrada].DesfaseSegundos || null,
        };
      }

      // Incluir salida solo si está habilitada la configuración
      if (incluirSalidas && registrosAsistencia[ModoRegistro.Salida]) {
        asistenciaDia[ModoRegistro.Salida] = {
          DesfaseSegundos:
            registrosAsistencia[ModoRegistro.Salida].DesfaseSegundos || null,
        };
      }

      resultado[diaNumero] = asistenciaDia;
    }

    return resultado;
  } catch (error) {
    console.error("Error parseando asistencias:", error);
    return {};
  }
}
