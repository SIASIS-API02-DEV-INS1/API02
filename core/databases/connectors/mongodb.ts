// src/core/database/connectors/mongodb.ts
import { MongoClient, Db, Collection, MongoClientOptions } from "mongodb";
import dotenv from "dotenv";
import {
  MONGO_CONNECTION_TIMEOUT,
  MONGO_SERVER_SELECTION_TIMEOUT,
  MONGO_MAX_POOL_SIZE,
  MONGO_MIN_POOL_SIZE,
} from "../../../src/constants/MONGODB_ATLAS_MONGODB_CONFIG";
import { RolesSistema } from "../../../src/interfaces/shared/RolesSistema";
import { RDP03 } from "../../../src/interfaces/shared/RDP03Instancias";

import { getRDP03InstancesForThisRol } from "../../../src/lib/helpers/instances/getRDP03InstancesForThisRol";
import { esOperacionMongoLectura } from "../../../src/lib/helpers/comprobations/esOperacionMongoLectura";
import { getRDP03DatabaseURLForThisInstance } from "../../../src/lib/helpers/instances/getRDP03DatabaseURLForThisInstance";
import { getInstanciasRDP03AfectadasPorRoles } from "../../../src/lib/helpers/instances/getInstanciasRDP03AfectadasPorRoles";
import { consultarConEMCN01 } from "../../external/github/EMCN01/consultarConEMCN01";
import { RDP03_Nombres_Tablas } from "../../../src/interfaces/shared/RDP03/RDP03_Tablas";
import { MongoOperation } from "../../../src/interfaces/shared/RDP03/MongoOperation";

dotenv.config();

// Mapa para almacenar clientes de MongoDB por URL
const clientMap = new Map<string, MongoClient>();
const dbMap = new Map<string, Db>();

/**
 * Obtiene o crea un cliente MongoDB para una URL específica
 * @param connectionURL URL de conexión a MongoDB
 * @returns Cliente MongoDB
 */
async function getOrCreateClient(connectionURL: string): Promise<MongoClient> {
  // Verificar si ya existe un cliente para esta URL
  let client = clientMap.get(connectionURL);

  if (!client) {
    // Configuración de opciones para MongoDB
    const options: MongoClientOptions = {
      maxPoolSize: parseInt(MONGO_MAX_POOL_SIZE || "10", 10),
      minPoolSize: parseInt(MONGO_MIN_POOL_SIZE || "2", 10),
      maxIdleTimeMS: 30000,
      serverSelectionTimeoutMS: parseInt(
        MONGO_SERVER_SELECTION_TIMEOUT || "5000",
        10
      ),
      connectTimeoutMS: parseInt(MONGO_CONNECTION_TIMEOUT || "10000", 10),
      heartbeatFrequencyMS: 10000,
      retryWrites: true,
      retryReads: true,
    };

    // Crear nuevo cliente
    client = new MongoClient(connectionURL, options);

    // Conectar el cliente
    await client.connect();

    // Agregar manejadores de eventos
    client.on("error", (err: any) => {
      console.error("Error inesperado en cliente MongoDB:", err);
    });

    client.on("close", () => {
      console.log("Conexión MongoDB cerrada");
    });

    // Almacenar cliente para reutilización
    clientMap.set(connectionURL, client);
  }

  return client;
}

/**
 * Obtiene o crea una base de datos MongoDB
 * @param connectionURL URL de conexión
 * @param dbName Nombre de la base de datos
 * @returns Base de datos MongoDB
 */
async function getOrCreateDatabase(
  connectionURL: string,
  dbName: string = "siasis_asuncion_8"
): Promise<Db> {
  const dbKey = `${connectionURL}_${dbName}`;

  // Verificar si ya existe la DB en cache
  let db = dbMap.get(dbKey);

  if (!db) {
    // Obtener o crear cliente
    const client = await getOrCreateClient(connectionURL);

    // Obtener la base de datos
    db = client.db(dbName);

    // Almacenar en cache
    dbMap.set(dbKey, db);
  }

  return db;
}

/**
 * Obtiene una instancia aleatoria para un rol específico
 * @param rol Rol del sistema
 * @returns Instancia aleatoria
 */
function getRandomInstanceForRole(rol: RolesSistema): RDP03 {
  // Obtener instancias disponibles para el rol
  const instances = getRDP03InstancesForThisRol(rol);

  if (instances.length === 0) {
    throw new Error(`No hay instancias configuradas para el rol ${rol}`);
  }

  // Seleccionar una instancia aleatoria
  const randomIndex = Math.floor(Math.random() * instances.length);
  return instances[randomIndex];
}

/**
 * Obtiene una instancia aleatoria de cualquiera de las disponibles
 * @returns Instancia aleatoria de entre todas las configuradas
 */
function getRandomInstance(): RDP03 {
  // Obtener todas las instancias disponibles
  const allInstances = Object.values(RDP03);

  if (allInstances.length === 0) {
    throw new Error("No hay instancias configuradas en el sistema");
  }

  // Seleccionar una instancia aleatoria
  const randomIndex = Math.floor(Math.random() * allInstances.length);
  return allInstances[randomIndex];
}

/**
 * Ejecuta una operación MongoDB
 * @param instanciaEnUso Instancia donde se ejecutará la operación inicialmente (opcional para lecturas)
 * @param operation Operación MongoDB a ejecutar
 * @param rol Rol del usuario que ejecuta la operación (opcional para lecturas)
 * @param rolesAfectados Roles cuyos datos serán afectados (opcional para operaciones de escritura)
 * @returns Resultado de la operación
 */
export async function executeMongoOperation<T = any>(
  instanciaEnUso: RDP03 | undefined,
  operation: MongoOperation,
  rol?: RolesSistema,
  rolesAfectados?: RolesSistema[]
): Promise<T> {
  // Determinar si es operación de lectura o escritura
  const isRead = esOperacionMongoLectura(operation.operation);

  console.log("Instancia:", instanciaEnUso);

  // Validar los parámetros según el tipo de operación
  if (isRead) {
    // Para operaciones de LECTURA
    if (instanciaEnUso === undefined) {
      // Si hay rol especificado, seleccionar instancia para ese rol
      if (rol) {
        instanciaEnUso = getRandomInstanceForRole(rol);
        console.log(
          `Operación de lectura: Seleccionada instancia aleatoria ${instanciaEnUso} para rol ${rol}`
        );
      }
      // Si no hay rol especificado, seleccionar cualquier instancia
      else {
        instanciaEnUso = getRandomInstance();
        console.log(
          `Operación de lectura: Seleccionada instancia aleatoria ${instanciaEnUso} (sin rol específico)`
        );
      }
    }
  } else {
    // Para operaciones de ESCRITURA
    if (instanciaEnUso === undefined) {
      throw new Error(
        "Para operaciones de escritura, se requiere especificar una instancia"
      );
    }

    // Si no se proporcionan roles afectados, considerar que afecta a todos los roles
    if (!rolesAfectados || rolesAfectados.length === 0) {
      rolesAfectados = Object.values(RolesSistema);
      console.log(
        "No se especificaron roles afectados. Considerando que afecta a TODOS los roles."
      );
    }
  }

  // Obtener la URL de conexión para la instancia en uso
  const connectionURL = getRDP03DatabaseURLForThisInstance(instanciaEnUso);

  // Verificar si se obtuvo una URL válida
  if (!connectionURL) {
    throw new Error(
      `No hay URL de conexión disponible para la instancia ${instanciaEnUso}`
    );
  }

  try {
    // Obtener la base de datos
    const db = await getOrCreateDatabase(connectionURL);

    // Obtener la colección
    const collection = db.collection(operation.collection);

    // Registrar inicio de la operación
    const start = Date.now();

    // Ejecutar la operación según el tipo
    let result: any;

    switch (operation.operation) {
      case "find":
        result = await collection
          .find(operation.filter || {}, operation.options)
          .toArray();
        break;

      case "findOne":
        result = await collection.findOne(
          operation.filter || {},
          operation.options
        );
        break;

      case "insertOne":
        result = await collection.insertOne(operation.data, operation.options);
        break;

      case "insertMany":
        result = await collection.insertMany(operation.data, operation.options);
        break;

      case "updateOne":
        result = await collection.updateOne(
          operation.filter || {},
          operation.data,
          operation.options
        );
        break;

      case "updateMany":
        result = await collection.updateMany(
          operation.filter || {},
          operation.data,
          operation.options
        );
        break;

      case "deleteOne":
        result = await collection.deleteOne(
          operation.filter || {},
          operation.options
        );
        break;

      case "deleteMany":
        result = await collection.deleteMany(
          operation.filter || {},
          operation.options
        );
        break;

      case "replaceOne":
        result = await collection.replaceOne(
          operation.filter || {},
          operation.data,
          operation.options
        );
        break;

      case "aggregate":
        result = await collection
          .aggregate(operation.pipeline || [], operation.options)
          .toArray();
        break;

      case "countDocuments":
        result = await collection.countDocuments(
          operation.filter || {},
          operation.options
        );
        break;

      default:
        throw new Error(`Operación no soportada: ${operation.operation}`);
    }

    // Calcular duración
    const duration = Date.now() - start;

    // Si estamos en entorno de desarrollo, imprimir logs
    if (process.env.ENTORNO === "D") {
      console.log(
        `Operación MongoDB ejecutada en instancia ${instanciaEnUso}`,
        {
          operacion: isRead ? "Lectura" : "Escritura",
          operation: operation.operation,
          collection: operation.collection,
          duration,
          result:
            typeof result === "object" && result !== null
              ? Array.isArray(result)
                ? `${result.length} documentos`
                : "documento único"
              : result,
        }
      );
    }

    // Si es una operación de escritura, replicar en las demás instancias a través del webhook
    if (!isRead && rolesAfectados && rolesAfectados.length > 0) {
      // Obtener las instancias afectadas (únicas y excluyendo la instancia en uso)
      const instanciasAActualizar = getInstanciasRDP03AfectadasPorRoles(
        rolesAfectados,
        instanciaEnUso
      );

      // Si hay instancias para actualizar, enviar el webhook
      if (instanciasAActualizar.length > 0) {
        console.log(
          `Replicando operación de escritura en: ${instanciasAActualizar.join(
            ", "
          )}`
        );

        // Llamar a EMCN01 para replicar la operación en las otras instancias
        await consultarConEMCN01(operation, instanciasAActualizar).catch(
          (err) => console.error("Error en replicación asíncrona:", err)
        );
      }
    }

    return result;
  } catch (error) {
    console.error(
      `Error ejecutando operación MongoDB en instancia ${instanciaEnUso}:`,
      error
    );
    throw error;
  }
}

/**
 * Ejecuta una transacción en MongoDB
 * @param instanciaEnUso Instancia donde se ejecutará la transacción (obligatorio)
 * @param callback Función que contiene las operaciones de la transacción
 * @param rolesAfectados Roles cuyos datos serán afectados (opcional, por defecto afecta a todos)
 * @returns Resultado de la transacción
 */
export async function executeMongoTransaction<T = any>(
  instanciaEnUso: RDP03,
  callback: (session: any, db: Db) => Promise<T>,
  rolesAfectados?: RolesSistema[]
): Promise<T> {
  // Validar parámetros requeridos
  if (!instanciaEnUso) {
    throw new Error(
      "Para transacciones, se requiere especificar una instancia"
    );
  }

  // Si no se proporcionan roles afectados, considerar que afecta a todos los roles
  if (!rolesAfectados || rolesAfectados.length === 0) {
    rolesAfectados = Object.values(RolesSistema);
    console.log(
      "No se especificaron roles afectados en la transacción. Considerando que afecta a TODOS los roles."
    );
  }

  // Obtener la URL de conexión para la instancia en uso
  const connectionURL = getRDP03DatabaseURLForThisInstance(instanciaEnUso);

  // Verificar si se obtuvo una URL válida
  if (!connectionURL) {
    throw new Error(
      `No hay URL de conexión disponible para la instancia ${instanciaEnUso}`
    );
  }

  // Obtener cliente y base de datos
  const client = await getOrCreateClient(connectionURL);
  const db = await getOrCreateDatabase(connectionURL);

  // Array para almacenar operaciones de escritura
  const writeOperations: MongoOperation[] = [];

  // Crear una sesión para la transacción
  const session = client.startSession();

  try {
    // Ejecutar transacción
    const result = await session.withTransaction(async () => {
      // Crear proxy de la base de datos para interceptar operaciones de escritura
      const enhancedDb = new Proxy(db, {
        get(target, prop, receiver) {
          if (prop === "collection") {
            return function (name: RDP03_Nombres_Tablas) {
              const collection = target.collection(name);

              // Crear proxy de la colección para interceptar operaciones
              return new Proxy(collection, {
                get(colTarget, colProp, colReceiver) {
                  const originalMethod = Reflect.get(
                    colTarget,
                    colProp,
                    colReceiver
                  );

                  // Interceptar métodos de escritura
                  if (
                    typeof originalMethod === "function" &&
                    [
                      "insertOne",
                      "insertMany",
                      "updateOne",
                      "updateMany",
                      "deleteOne",
                      "deleteMany",
                      "replaceOne",
                    ].includes(colProp as string)
                  ) {
                    return async function (...args: any[]) {
                      // Ejecutar operación original
                      const result = await originalMethod.apply(
                        colTarget,
                        args
                      );

                      // Capturar operación para replicación
                      const operation: MongoOperation = {
                        operation: colProp as any,
                        collection: name,
                        filter: args[0],
                        data: args[1],
                        options: args[2],
                      };

                      writeOperations.push(operation);

                      return result;
                    };
                  }

                  return originalMethod;
                },
              });
            };
          }

          return Reflect.get(target, prop, receiver);
        },
      });

      // Ejecutar callback con la base de datos proxy
      return await callback(session, enhancedDb);
    });

    // Si hay operaciones de escritura, replicar en las demás instancias
    if (writeOperations.length > 0) {
      // Obtener las instancias afectadas
      const instanciasAActualizar = getInstanciasRDP03AfectadasPorRoles(
        rolesAfectados,
        instanciaEnUso
      );

      // Si hay instancias para actualizar, enviar webhook para cada operación
      if (instanciasAActualizar.length > 0) {
        console.log(
          `Replicando transacción en: ${instanciasAActualizar.join(", ")}`
        );

        for (const operation of writeOperations) {
          // Llamar a EMCN01 para replicar la operación en las otras instancias
          consultarConEMCN01(operation, instanciasAActualizar).catch((err) =>
            console.error("Error en replicación asíncrona de transacción:", err)
          );
        }
      }
    }

    return result;
  } catch (error) {
    console.error(
      `Error en transacción MongoDB en instancia ${instanciaEnUso}:`,
      error
    );
    throw error;
  } finally {
    // Cerrar sesión
    await session.endSession();
  }
}

/**
 * Cliente MongoDB que facilita operaciones con múltiples instancias
 */
export const mongoClient = {
  /**
   * Ejecuta una operación de lectura en una instancia específica o aleatoria para un rol
   * @param operation Operación MongoDB (debe ser de lectura)
   * @param options Opciones adicionales: instancia específica o rol para seleccionar instancia
   * @returns Resultado de la operación
   */
  read: async <T = any>(
    operation: MongoOperation,
    options: { instancia?: RDP03; rol?: RolesSistema } = {}
  ): Promise<T> => {
    // Verificar que sea una operación de lectura
    if (!esOperacionMongoLectura(operation.operation)) {
      throw new Error(
        "Este método solo debe usarse para operaciones de lectura"
      );
    }

    // Ejecutar la operación
    return await executeMongoOperation<T>(
      options.instancia,
      operation,
      options.rol
    );
  },

  /**
   * Ejecuta una operación de escritura en una instancia específica y la replica en otras instancias relevantes
   * @param instancia Instancia donde se ejecutará inicialmente la operación (obligatorio)
   * @param operation Operación MongoDB (debe ser de escritura)
   * @param rolesAfectados Roles cuyos datos serán afectados (opcional, por defecto afecta a todos)
   * @returns Resultado de la operación
   */
  write: async <T = any>(
    instancia: RDP03,
    operation: MongoOperation,
    rolesAfectados?: RolesSistema[]
  ): Promise<T> => {
    // Verificar que sea una operación de escritura
    if (esOperacionMongoLectura(operation.operation)) {
      throw new Error(
        "Este método solo debe usarse para operaciones de escritura"
      );
    }

    // Validar parámetros requeridos
    if (!instancia) {
      throw new Error(
        "Para operaciones de escritura, se requiere especificar una instancia"
      );
    }

    // Ejecutar la operación
    return await executeMongoOperation<T>(
      instancia,
      operation,
      undefined,
      rolesAfectados
    );
  },

  /**
   * Ejecuta una transacción en una instancia específica y replica las operaciones de escritura
   * @param instancia Instancia donde se ejecutará la transacción (obligatorio)
   * @param callback Función que contiene las operaciones de la transacción
   * @param rolesAfectados Roles cuyos datos serán afectados (opcional, por defecto afecta a todos)
   * @returns Resultado de la transacción
   */
  transaction: async <T = any>(
    instancia: RDP03,
    callback: (session: any, db: Db) => Promise<T>,
    rolesAfectados?: RolesSistema[]
  ): Promise<T> => {
    return await executeMongoTransaction<T>(
      instancia,
      callback,
      rolesAfectados
    );
  },

  /**
   * Obtiene una colección específica de una instancia
   * @param instancia Instancia de la base de datos
   * @param collectionName Nombre de la colección
   * @returns Colección MongoDB
   */
  getCollection: async (
    instancia: RDP03,
    collectionName: string
  ): Promise<Collection> => {
    const connectionURL = getRDP03DatabaseURLForThisInstance(instancia);

    if (!connectionURL) {
      throw new Error(
        `No hay URL de conexión disponible para la instancia ${instancia}`
      );
    }

    const db = await getOrCreateDatabase(connectionURL);
    return db.collection(collectionName);
  },

  /**
   * Cierra todas las conexiones
   */
  closeAllConnections: async (): Promise<void> => {
    await closeAllConnections();
  },
};

/**
 * Cierra todas las conexiones MongoDB
 */
export async function closeAllConnections(): Promise<void> {
  const closePromises = Array.from(clientMap.entries()).map(
    async ([url, client]) => {
      try {
        await client.close();
        console.log(
          `Cliente MongoDB cerrado para URL: ${url.substring(0, 20)}...`
        );
      } catch (error) {
        console.error(`Error al cerrar cliente MongoDB: ${error}`);
      }
    }
  );

  // Esperar a que todos los clientes se cierren
  await Promise.all(closePromises);

  // Limpiar los mapas
  clientMap.clear();
  dbMap.clear();

  console.log("Todas las conexiones MongoDB han sido cerradas");
}
