import { Router, Request, Response, NextFunction } from 'express';

import { GetOrderStatuses } from '../controllers/orderStatusesController';

const router = Router();

router.get("/", GetOrderStatuses);

export default router;