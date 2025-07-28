// routes/index.ts
import { Router } from "express";

import { UserAuthenticatedAPI01 } from "../interfaces/shared/JWTPayload";
import AllErrorTypes from "../interfaces/shared/errors";
import { ErrorDetails } from "../interfaces/shared/errors/details";

import loginRouter from "./api/login";

import { RolesSistema } from "../interfaces/shared/RolesSistema";
import { RDP02 } from "../interfaces/shared/RDP02Instancias";
import { RDP03 } from "../interfaces/shared/RDP03Instancias";
import decodedRol from "../middlewares/decodedRol";
import isResponsableAuthenticated from "../middlewares/isResponsableAuthenticated";
import checkAuthentication from "../middlewares/checkAuthentication";
import misDatosRouter from "./api/mis-datos";
import EventosRouter from "./api/eventos";
import modificacionesTablasRouter from "./api/modificaciones-tablas";

import isDirectivoAuthenticated from "../middlewares/isDirectivoAuthenticated";
import isProfesorPrimariaAuthenticated from "../middlewares/isProfesorPrimariaAuthenticated";
import isProfesorSecundariaAuthenticated from "../middlewares/isProfesorSecundariaAuthenticated";
import isTutorAuthenticated from "../middlewares/isTutorAuthenticated";
import isAuxiliarAuthenticated from "../middlewares/isAuxiliarAuthenticated";
import isPersonalAdministrativoAuthenticated from "../middlewares/isPersonalAdministrativoAuthenticated";


const router = Router();

// Extender la interfaz Request de Express
declare global {
  namespace Express {
    interface Request {
      RDP02_INSTANCE?: RDP02;
      RDP03_INSTANCE?: RDP03;
      user?: UserAuthenticatedAPI01;
      isAuthenticated?: boolean;
      userRole?: RolesSistema;
      authError?: {
        type: AllErrorTypes;
        message: string;
        details?: ErrorDetails;
      };
    }
  }
}

router.use("/login", loginRouter);

router.use(
  "/mis-datos",
  decodedRol as any,
  isResponsableAuthenticated,
  checkAuthentication as any,
  misDatosRouter
);

router.use(
  "/modificaciones-tablas",
  decodedRol as any,
  isDirectivoAuthenticated,
  isProfesorPrimariaAuthenticated,
  isProfesorSecundariaAuthenticated,
  isTutorAuthenticated,
  isAuxiliarAuthenticated,
  isPersonalAdministrativoAuthenticated as any,
  isResponsableAuthenticated,
  checkAuthentication as any,
  modificacionesTablasRouter
);

router.use("/eventos", decodedRol as any, EventosRouter);

export default router;
