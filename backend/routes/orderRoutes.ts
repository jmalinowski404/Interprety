import { Router, Request, Response, NextFunction } from 'express';

import { GetOrderById, GetOrders, CreateOrder, UpdateOrderStatus } from '../controllers/orderController';

const router = Router();

router.get("/", GetOrders);
router.get("/:id", GetOrderById);
router.post("/", CreateOrder);
router.patch("/:id/status", UpdateOrderStatus);

export default router;