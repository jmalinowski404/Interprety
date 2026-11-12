import { Router, Request, Response, NextFunction } from 'express';

import { GetOrderById, GetOrders, CreateOrder } from '../controllers/orderController';

const router = Router();

router.get("/", GetOrders);
router.get("/:id", GetOrderById);
router.post("/", CreateOrder);

export default router;