import { Request, Response, Router } from "express";
import { ErrorResponseAPIBase } from "../../../interfaces/shared/apis/types";
import {
  RequestErrorTypes,
  SystemErrorTypes,
} from "../../../interfaces/shared/errors";

import checkAuthentication from "../../../middlewares/checkAuthentication";
import { GetEventosSuccessResponse } from "../../../interfaces/shared/apis/eventos/types";
import isResponsableAuthenticated from "../../../middlewares/isResponsableAuthenticated";
import {
  buscarEventos,
  buscarEventosPorAño,
} from "../../../../core/databases/queries/RDP03/eventos/buscarEventosPorMes";

const EventosRouter = Router();

const MAXIMA_CANTIDAD_EVENTOS = 100; // Límite máximo de eventos por consulta

EventosRouter.get(
  "/",
  isResponsableAuthenticated as any,
  checkAuthentication as any,
  (async (req: Request, res: Response) => {
    try {
      const { Mes, Año, Limit, Offset } = req.query;
      // Actualizado para usar RDP03 en lugar de RDP02
      const rdp03EnUso = req.RDP03_INSTANCE!;

      console.log("Parámetros recibidos:", { Mes, Año, Limit, Offset });

      // Parsear parámetros opcionales
      const limit = Limit ? Number(Limit) : MAXIMA_CANTIDAD_EVENTOS;
      const offset = Offset ? Number(Offset) : 0;
      const mes = Mes ? Number(Mes) : undefined;
      const año = Año ? Number(Año) : undefined;

      // Validar límite
      if (isNaN(limit) || limit < 1 || limit > MAXIMA_CANTIDAD_EVENTOS) {
        return res.status(400).json({
          success: false,
          message: `El límite debe ser un número entre 1 y ${MAXIMA_CANTIDAD_EVENTOS}`,
          errorType: RequestErrorTypes.INVALID_PARAMETERS,
        } as ErrorResponseAPIBase);
      }

      // Validar offset
      if (isNaN(offset) || offset < 0) {
        return res.status(400).json({
          success: false,
          message: "El offset debe ser un número mayor o igual a 0",
          errorType: RequestErrorTypes.INVALID_PARAMETERS,
        } as ErrorResponseAPIBase);
      }

      // Validar mes si se proporciona
      if (mes !== undefined && (isNaN(mes) || mes < 1 || mes > 12)) {
        return res.status(400).json({
          success: false,
          message: "El mes debe ser un número entre 1 y 12",
          errorType: RequestErrorTypes.INVALID_PARAMETERS,
        } as ErrorResponseAPIBase);
      }

      // Validar año si se proporciona
      if (año !== undefined && (isNaN(año) || año < 1900 || año > 2100)) {
        return res.status(400).json({
          success: false,
          message: "El año debe ser un número válido entre 1900 y 2100",
          errorType: RequestErrorTypes.INVALID_PARAMETERS,
        } as ErrorResponseAPIBase);
      }

      // Buscar eventos usando la función unificada
      const { eventos, total } = await buscarEventos(
        { mes, año, limit, offset },
        rdp03EnUso
      );

      // Si no se encuentran eventos, devolver 404 con total = 0
      if (eventos.length === 0) {
        let notFoundMessage: string;
        if (mes !== undefined) {
          notFoundMessage = `No se encontraron eventos para el mes ${mes}${
            año ? ` del año ${año}` : ""
          }`;
        } else {
          notFoundMessage = "No se encontraron eventos en el sistema";
        }

        return res.status(404).json({
          success: true,
          message: notFoundMessage,
          data: [],
          total: 0,
        } as GetEventosSuccessResponse);
      }

      // Generar mensaje apropiado según el tipo de búsqueda
      let message: string;
      if (mes !== undefined) {
        message = `Se encontraron ${
          eventos.length
        } evento(s) de ${total} totales para el mes ${mes}${
          año ? ` del año ${año}` : ""
        }`;
      } else {
        message = `Se encontraron ${eventos.length} evento(s) de ${total} totales (eventos más antiguos)`;
      }

      // Respuesta exitosa con paginación
      return res.status(200).json({
        success: true,
        message,
        data: eventos,
        total,
      } as GetEventosSuccessResponse);
    } catch (error) {
      console.error("Error al buscar eventos:", error);

      return res.status(500).json({
        success: false,
        message: "Error interno del servidor al buscar eventos",
        errorType: SystemErrorTypes.UNKNOWN_ERROR,
        details: error,
      } as ErrorResponseAPIBase);
    }
  }) as any
);

export default EventosRouter;
