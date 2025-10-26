import { RDP03 } from "../../../../../src/interfaces/shared/RDP03Instancias";
import { executeMongoOperation } from "../../../connectors/mongodb";
import { RolesSistema } from "../../../../../src/interfaces/shared/RolesSistema";
import { T_Eventos } from "@prisma/client";

interface BuscarEventosParams {
  mes?: number;
  año?: number;
  limit: number;
  offset: number;
}

/**
 * Busca eventos con filtros opcionales y paginación
 * @param params Parámetros de búsqueda
 * @param instanciaEnUso Instancia específica donde ejecutar la consulta (opcional)
 * @returns Objeto con array de eventos y total de eventos encontrados
 */
export async function buscarEventos(
  params: BuscarEventosParams,
  instanciaEnUso?: RDP03
): Promise<{ eventos: T_Eventos[]; total: number }> {
  try {
    const { mes, año, limit, offset } = params;

    let filtroComun: any = {};

    // Si se especifica mes, filtrar por ese mes
    if (mes !== undefined) {
      const añoConsulta = año || new Date().getFullYear();

      // Crear fechas de inicio y fin del mes para la consulta
      const inicioMes = new Date(añoConsulta, mes - 1, 1);
      const finMes = new Date(añoConsulta, mes, 0);
      finMes.setHours(23, 59, 59, 999);

      filtroComun = {
        $or: [
          // Eventos que inician en el mes consultado
          {
            $and: [
              { Fecha_Inicio: { $gte: inicioMes } },
              { Fecha_Inicio: { $lte: finMes } },
            ],
          },
          // Eventos que terminan en el mes consultado
          {
            $and: [
              { Fecha_Conclusion: { $gte: inicioMes } },
              { Fecha_Conclusion: { $lte: finMes } },
            ],
          },
          // Eventos que abarcan todo el mes
          {
            $and: [
              { Fecha_Inicio: { $lte: inicioMes } },
              { Fecha_Conclusion: { $gte: finMes } },
            ],
          },
        ],
      };
    }
    // Si no se especifica mes, traer todos los eventos (sin filtro adicional)

    // Contar el total de eventos que coinciden con el filtro
    const total = await executeMongoOperation<number>(
      instanciaEnUso,
      {
        operation: "countDocuments",
        collection: "T_Eventos",
        filter: filtroComun,
      },
      RolesSistema.Responsable
    );

    // Obtener los eventos con paginación (ahora SÍ incluimos _id)
    const eventosRaw = await executeMongoOperation<any[]>(
      instanciaEnUso,
      {
        operation: "find",
        collection: "T_Eventos",
        filter: filtroComun,
        options: {
          sort: { Fecha_Inicio: 1 }, // Ordenar por fecha de inicio ascendente
          skip: offset,
          limit: limit,
          projection: {
            _id: 1, // Ahora SÍ incluimos _id para transformarlo
            Nombre: 1,
            Fecha_Inicio: 1,
            Fecha_Conclusion: 1,
          },
        },
      },
      RolesSistema.Responsable
    );

    // Transformar _id a Id_Evento
    const eventos: T_Eventos[] = (eventosRaw || []).map((evento) => ({
      Id_Evento: evento._id.toString(), // Convertir ObjectId a string
      Nombre: evento.Nombre,
      Fecha_Inicio: evento.Fecha_Inicio,
      Fecha_Conclusion: evento.Fecha_Conclusion,
    }));

    return {
      eventos,
      total: total || 0,
    };
  } catch (error) {
    console.error("Error buscando eventos:", error);
    throw error;
  }
}

/**
 * Busca eventos que ocurren en un mes específico con paginación
 * @param mes Mes a consultar (1-12)
 * @param año Año a consultar (opcional, por defecto año actual)
 * @param instanciaEnUso Instancia específica donde ejecutar la consulta (opcional)
 * @param limit Cantidad máxima de eventos a retornar
 * @param offset Cantidad de eventos a saltar
 * @returns Objeto con array de eventos y total de eventos encontrados
 */
export async function buscarEventosPorMes(
  mes: number,
  año?: number,
  instanciaEnUso?: RDP03,
  limit: number = 100,
  offset: number = 0
): Promise<{ eventos: T_Eventos[]; total: number }> {
  try {
    const añoConsulta = año || new Date().getFullYear();

    // Crear fechas de inicio y fin del mes para la consulta
    const inicioMes = new Date(añoConsulta, mes - 1, 1); // mes - 1 porque Date usa meses 0-11
    const finMes = new Date(añoConsulta, mes, 0); // Último día del mes
    finMes.setHours(23, 59, 59, 999); // Incluir todo el último día

    // Definir el filtro común para ambas operaciones
    const filtroComun = {
      $or: [
        // Eventos que inician en el mes consultado
        {
          $and: [
            { Fecha_Inicio: { $gte: inicioMes } },
            { Fecha_Inicio: { $lte: finMes } },
          ],
        },
        // Eventos que terminan en el mes consultado
        {
          $and: [
            { Fecha_Conclusion: { $gte: inicioMes } },
            { Fecha_Conclusion: { $lte: finMes } },
          ],
        },
        // Eventos que abarcan todo el mes (inician antes y terminan después)
        {
          $and: [
            { Fecha_Inicio: { $lte: inicioMes } },
            { Fecha_Conclusion: { $gte: finMes } },
          ],
        },
      ],
    };

    // Contar el total de eventos que coinciden con el filtro
    const total = await executeMongoOperation<number>(
      instanciaEnUso,
      {
        operation: "countDocuments",
        collection: "T_Eventos",
        filter: filtroComun,
      },
      RolesSistema.Responsable
    );

    // Obtener los eventos con paginación
    const eventos = await executeMongoOperation<T_Eventos[]>(
      instanciaEnUso,
      {
        operation: "find",
        collection: "T_Eventos",
        filter: filtroComun,
        options: {
          sort: { Fecha_Inicio: 1 }, // Ordenar por fecha de inicio ascendente
          skip: offset,
          limit: limit,
          projection: {
            Id_Evento: 1,
            Nombre: 1,
            Fecha_Inicio: 1,
            Fecha_Conclusion: 1,
            _id: 0, // Excluir el _id de MongoDB para mantener compatibilidad
          },
        },
      },
      RolesSistema.Responsable // Los responsables pueden ver eventos
    );

    return {
      eventos: eventos || [],
      total: total || 0,
    };
  } catch (error) {
    console.error("Error buscando eventos por mes:", error);
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
  return eventos.filter((evento) => {
    const inicioEvento = new Date(evento.Fecha_Inicio);
    const finEvento = new Date(evento.Fecha_Conclusion);

    return (
      inicioEvento <= fechaFin && finEvento >= fechaInicio // Cualquier traslape
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
        operation: "find",
        collection: "T_Eventos",
        filter: {
          $or: [
            // Eventos que ocurren durante el año
            {
              $and: [
                { Fecha_Inicio: { $gte: inicioAño } },
                { Fecha_Inicio: { $lte: finAño } },
              ],
            },
            {
              $and: [
                { Fecha_Conclusion: { $gte: inicioAño } },
                { Fecha_Conclusion: { $lte: finAño } },
              ],
            },
            // Eventos que abarcan todo el año
            {
              $and: [
                { Fecha_Inicio: { $lte: inicioAño } },
                { Fecha_Conclusion: { $gte: finAño } },
              ],
            },
          ],
        },
        options: {
          sort: { Fecha_Inicio: 1 },
          projection: {
            Id_Evento: 1,
            Nombre: 1,
            Fecha_Inicio: 1,
            Fecha_Conclusion: 1,
            _id: 0,
          },
        },
      },
      RolesSistema.Directivo // Solo directivos pueden ver eventos completos del año
    );

    return eventos || [];
  } catch (error) {
    console.error("Error buscando eventos por año:", error);
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
        operation: "find",
        collection: "T_Eventos",
        filter: {
          $or: [
            // Eventos que inician en el rango
            {
              $and: [
                { Fecha_Inicio: { $gte: fechaInicio } },
                { Fecha_Inicio: { $lte: fechaFin } },
              ],
            },
            // Eventos que terminan en el rango
            {
              $and: [
                { Fecha_Conclusion: { $gte: fechaInicio } },
                { Fecha_Conclusion: { $lte: fechaFin } },
              ],
            },
            // Eventos que abarcan todo el rango
            {
              $and: [
                { Fecha_Inicio: { $lte: fechaInicio } },
                { Fecha_Conclusion: { $gte: fechaFin } },
              ],
            },
          ],
        },
        options: {
          sort: { Fecha_Inicio: 1 },
          projection: {
            Id_Evento: 1,
            Nombre: 1,
            Fecha_Inicio: 1,
            Fecha_Conclusion: 1,
            _id: 0,
          },
        },
      },
      RolesSistema.Directivo
    );

    return eventos || [];
  } catch (error) {
    console.error("Error buscando eventos por rango:", error);
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
        operation: "findOne",
        collection: "T_Eventos",
        filter: { Id_Evento: idEvento },
        options: {
          projection: {
            Id_Evento: 1,
            Nombre: 1,
            Fecha_Inicio: 1,
            Fecha_Conclusion: 1,
            _id: 0,
          },
        },
      },
      RolesSistema.Responsable
    );

    return evento;
  } catch (error) {
    console.error("Error buscando evento por ID:", error);
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
        operation: "countDocuments",
        collection: "T_Eventos",
        filter: {
          $or: [
            {
              $and: [
                { Fecha_Inicio: { $gte: inicioMes } },
                { Fecha_Inicio: { $lte: finMes } },
              ],
            },
            {
              $and: [
                { Fecha_Conclusion: { $gte: inicioMes } },
                { Fecha_Conclusion: { $lte: finMes } },
              ],
            },
            {
              $and: [
                { Fecha_Inicio: { $lte: inicioMes } },
                { Fecha_Conclusion: { $gte: finMes } },
              ],
            },
          ],
        },
        options: {},
      },
      RolesSistema.Responsable
    );

    return count || 0;
  } catch (error) {
    console.error("Error contando eventos por mes:", error);
    throw error;
  }
}
