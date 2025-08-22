
import { MongoOperation } from "../RDP03/MongoOperation";
import { RDP03 } from "../RDP03Instancias";

/**
 * Interfaz para la carga útil del webhook EMCN01 (MongoDB replication)
 */
export interface EMCN01Payload {
  event_type: string;
  client_payload: {
    operation: MongoOperation;
    instanciasAActualizar: RDP03[];
    timestamp: number;
  };
}


