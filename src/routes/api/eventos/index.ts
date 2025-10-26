import { Request, Response, Router } from "express";
import { ErrorResponseAPIBase } from "../../../interfaces/shared/apis/types";
import {
  RequestErrorTypes,
  SystemErrorTypes,
} from "../../../interfaces/shared/errors";

import { buscarEventosPorMes } from "../../../../core/databases/queries/RDP03/eventos/buscarEventosPorMes";
import wereObligatoryQueryParamsReceived from "../../../middlewares/wereObligatoryQueryParamsReceived";

import checkAuthentication from "../../../middlewares/checkAuthentication";
import { GetEventosSuccessResponse } from "../../../interfaces/shared/apis/eventos/types";
import isResponsableAuthenticated from "../../../middlewares/isResponsableAuthenticated";

const EventosRouter = Router();

const MAXIMA_CANTIDAD_EVENTOS = 100; // Límite máximo de eventos por consulta

EventosRouter.get(
  "/",
  wereObligatoryQueryParamsReceived(["Mes"]) as any,
  isResponsableAuthenticated as any,
  checkAuthentication as any,
  (async (req: Request, res: Response) => {
    try {
      const { Mes, Año, Limit, Offset } = req.query;
      // Actualizado para usar RDP03 en lugar de RDP02
      const rdp03EnUso = req.RDP03_INSTANCE!;

      console.log("Parámetros recibidos:", { Mes, Año, Limit, Offset });

      // Convertir a tipos apropiados
      const mes = parseInt(Mes as string);
      const año = Año ? parseInt(Año as string) : undefined;
      const limit = Limit ? Number(Limit) : MAXIMA_CANTIDAD_EVENTOS;
      const offset = Offset ? Number(Offset) : 0;

      // Validar mes (1-12)
      if (isNaN(mes) || mes < 1 || mes > 12) {
        return res.status(400).json({
          success: false,
          message: "El mes debe ser un número entre 1 y 12",
          errorType: RequestErrorTypes.INVALID_PARAMETERS,
        } as ErrorResponseAPIBase);
      }

      // Validar año (opcional)
      if (año !== undefined && (isNaN(año) || año < 1900 || año > 2100)) {
        return res.status(400).json({
          success: false,
          message: "El año debe ser un número válido entre 1900 y 2100",
          errorType: RequestErrorTypes.INVALID_PARAMETERS,
        } as ErrorResponseAPIBase);
      }

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

      // Buscar eventos del mes usando MongoDB con paginación
      const { eventos, total } = await buscarEventosPorMes(
        mes,
        año,
        rdp03EnUso,
        limit,
        offset
      );

      // Si no se encuentran eventos, devolver 404 con total = 0
      if (eventos.length === 0) {
        return res.status(404).json({
          success: true,
          message: `No se encontraron eventos para el mes ${mes}${
            año ? ` del año ${año}` : ""
          }`,
          data: [],
          total: 0,
        } as GetEventosSuccessResponse);
      }

      // Respuesta exitosa con paginación
      return res.status(200).json({
        success: true,
        message: `Se encontraron ${
          eventos.length
        } evento(s) de ${total} totales para el mes ${mes}${
          año ? ` del año ${año}` : ""
        }`,
        data: eventos,
        total,
      } as GetEventosSuccessResponse);
    } catch (error) {
      console.error("Error al buscar eventos por mes:", error);

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
