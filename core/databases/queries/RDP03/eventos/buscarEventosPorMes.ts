import { RDP03 } from "../../../../../src/interfaces/shared/RDP03Instancias";
import { executeMongoOperation } from "../../../connectors/mongodb";
import { RolesSistema } from "../../../../../src/interfaces/shared/RolesSistema";
import { T_Eventos } from "@prisma/client";


/**
 * Busca eventos que ocurren en un mes específico
 * @param mes Mes a consultar (1-12)
 * @param año Año a consultar (opcional, por defecto año actual)
 * @param instanciaEnUso Instancia específica donde ejecutar la consulta (opcional)
 * @returns Array de eventos que ocurren en el mes especificado
 */
export async function buscarEventosPorMes(
  mes: number,
  año?: number,
  instanciaEnUso?: RDP03
): Promise<T_Eventos[]> {
  try {
    const añoConsulta = año || new Date().getFullYear();

    // Crear fechas de inicio y fin del mes para la consulta
    const inicioMes = new Date(añoConsulta, mes - 1, 1); // mes - 1 porque Date usa meses 0-11
    const finMes = new Date(añoConsulta, mes, 0); // Último día del mes
    finMes.setHours(23, 59, 59, 999); // Incluir todo el último día

    const eventos = await executeMongoOperation<T_Eventos[]>(
      instanciaEnUso,
      {
        operation: 'find',
        collection: 'T_Eventos',
        filter: {
          $or: [
            // Eventos que inician en el mes consultado
            {
              $and: [
                { Fecha_Inicio: { $gte: inicioMes } },
                { Fecha_Inicio: { $lte: finMes } }
              ]
            },
            // Eventos que terminan en el mes consultado
            {
              $and: [
                { Fecha_Conclusion: { $gte: inicioMes } },
                { Fecha_Conclusion: { $lte: finMes } }
              ]
            },
            // Eventos que abarcan todo el mes (inician antes y terminan después)
            {
              $and: [
                { Fecha_Inicio: { $lte: inicioMes } },
                { Fecha_Conclusion: { $gte: finMes } }
              ]
            }
          ]
        },
        options: {
          sort: { Fecha_Inicio: 1 }, // Ordenar por fecha de inicio ascendente
          projection: {
            Id_Evento: 1,
            Nombre: 1,
            Fecha_Inicio: 1,
            Fecha_Conclusion: 1,
            _id: 0 // Excluir el _id de MongoDB para mantener compatibilidad
          }
        }
      },
      RolesSistema.Responsable // Los responsables pueden ver eventos
    );

    return eventos || [];
  } catch (error) {
    console.error('Error buscando eventos por mes:', error);
    throw error;
  }
}

/**
 * Verifica si hay conflictos entre una fecha dada y eventos existentes
 * @param fechaInicio Fecha de inicio a verificar
 * @param fechaFin Fecha de fin a verificar
 * @param eventos Array de eventos para verificar conflictos
 * @returns Array de eventos que tienen conflicto con las fechas dadas
 */
export function verificarConflictoConEventos(
  fechaInicio: Date,
  fechaFin: Date,
  eventos: T_Eventos[]
): T_Eventos[] {
  return eventos.filter(evento => {
    const inicioEvento = new Date(evento.Fecha_Inicio);
    const finEvento = new Date(evento.Fecha_Conclusion);

    return (
      (inicioEvento <= fechaFin && finEvento >= fechaInicio) // Cualquier traslape
    );
  });
}

/**
 * Busca todos los eventos de un año específico
 * @param año Año a consultar
 * @param instanciaEnUso Instancia específica donde ejecutar la consulta (opcional)
 * @returns Array de eventos del año especificado
 */
export async function buscarEventosPorAño(
  año: number,
  instanciaEnUso?: RDP03
): Promise<T_Eventos[]> {
  try {
    const inicioAño = new Date(año, 0, 1); // 1 de enero
    const finAño = new Date(año, 11, 31, 23, 59, 59, 999); // 31 de diciembre

    const eventos = await executeMongoOperation<T_Eventos[]>(
      instanciaEnUso,
      {
        operation: 'find',
        collection: 'T_Eventos',
        filter: {
          $or: [
            // Eventos que ocurren durante el año
            {
              $and: [
                { Fecha_Inicio: { $gte: inicioAño } },
                { Fecha_Inicio: { $lte: finAño } }
              ]
            },
            {
              $and: [
                { Fecha_Conclusion: { $gte: inicioAño } },
                { Fecha_Conclusion: { $lte: finAño } }
              ]
            },
            // Eventos que abarcan todo el año
            {
              $and: [
                { Fecha_Inicio: { $lte: inicioAño } },
                { Fecha_Conclusion: { $gte: finAño } }
              ]
            }
          ]
        },
        options: {
          sort: { Fecha_Inicio: 1 },
          projection: {
            Id_Evento: 1,
            Nombre: 1,
            Fecha_Inicio: 1,
            Fecha_Conclusion: 1,
            _id: 0
          }
        }
      },
      RolesSistema.Directivo // Solo directivos pueden ver eventos completos del año
    );

    return eventos || [];
  } catch (error) {
    console.error('Error buscando eventos por año:', error);
    throw error;
  }
}

/**
 * Busca eventos que ocurren en un rango de fechas específico
 * @param fechaInicio Fecha de inicio del rango
 * @param fechaFin Fecha de fin del rango
 * @param instanciaEnUso Instancia específica donde ejecutar la consulta (opcional)
 * @returns Array de eventos que ocurren en el rango de fechas
 */
export async function buscarEventosPorRango(
  fechaInicio: Date,
  fechaFin: Date,
  instanciaEnUso?: RDP03
): Promise<T_Eventos[]> {
  try {
    const eventos = await executeMongoOperation<T_Eventos[]>(
      instanciaEnUso,
      {
        operation: 'find',
        collection: 'T_Eventos',
        filter: {
          $or: [
            // Eventos que inician en el rango
            {
              $and: [
                { Fecha_Inicio: { $gte: fechaInicio } },
                { Fecha_Inicio: { $lte: fechaFin } }
              ]
            },
            // Eventos que terminan en el rango
            {
              $and: [
                { Fecha_Conclusion: { $gte: fechaInicio } },
                { Fecha_Conclusion: { $lte: fechaFin } }
              ]
            },
            // Eventos que abarcan todo el rango
            {
              $and: [
                { Fecha_Inicio: { $lte: fechaInicio } },
                { Fecha_Conclusion: { $gte: fechaFin } }
              ]
            }
          ]
        },
        options: {
          sort: { Fecha_Inicio: 1 },
          projection: {
            Id_Evento: 1,
            Nombre: 1,
            Fecha_Inicio: 1,
            Fecha_Conclusion: 1,
            _id: 0
          }
        }
      },
      RolesSistema.Directivo
    );

    return eventos || [];
  } catch (error) {
    console.error('Error buscando eventos por rango:', error);
    throw error;
  }
}

/**
 * Busca un evento específico por su ID
 * @param idEvento ID del evento a buscar
 * @param instanciaEnUso Instancia específica donde ejecutar la consulta (opcional)
 * @returns Evento encontrado o null si no existe
 */
export async function buscarEventoPorId(
  idEvento: number,
  instanciaEnUso?: RDP03
): Promise<T_Eventos | null> {
  try {
    const evento = await executeMongoOperation<T_Eventos>(
      instanciaEnUso,
      {
        operation: 'findOne',
        collection: 'T_Eventos',
        filter: { Id_Evento: idEvento },
        options: {
          projection: {
            Id_Evento: 1,
            Nombre: 1,
            Fecha_Inicio: 1,
            Fecha_Conclusion: 1,
            _id: 0
          }
        }
      },
      RolesSistema.Responsable
    );

    return evento;
  } catch (error) {
    console.error('Error buscando evento por ID:', error);
    throw error;
  }
}

/**
 * Cuenta el número de eventos en un mes específico
 * @param mes Mes a consultar (1-12)
 * @param año Año a consultar (opcional, por defecto año actual)
 * @param instanciaEnUso Instancia específica donde ejecutar la consulta (opcional)
 * @returns Número de eventos en el mes
 */
export async function contarEventosPorMes(
  mes: number,
  año?: number,
  instanciaEnUso?: RDP03
): Promise<number> {
  try {
    const añoConsulta = año || new Date().getFullYear();
    const inicioMes = new Date(añoConsulta, mes - 1, 1);
    const finMes = new Date(añoConsulta, mes, 0);
    finMes.setHours(23, 59, 59, 999);

    const count = await executeMongoOperation<number>(
      instanciaEnUso,
      {
        operation: 'countDocuments',
        collection: 'T_Eventos',
        filter: {
          $or: [
            {
              $and: [
                { Fecha_Inicio: { $gte: inicioMes } },
                { Fecha_Inicio: { $lte: finMes } }
              ]
            },
            {
              $and: [
                { Fecha_Conclusion: { $gte: inicioMes } },
                { Fecha_Conclusion: { $lte: finMes } }
              ]
            },
            {
              $and: [
                { Fecha_Inicio: { $lte: inicioMes } },
                { Fecha_Conclusion: { $gte: finMes } }
              ]
            }
          ]
        },
        options: {}
      },
      RolesSistema.Responsable
    );

    return count || 0;
  } catch (error) {
    console.error('Error contando eventos por mes:', error);
    throw error;
  }
}