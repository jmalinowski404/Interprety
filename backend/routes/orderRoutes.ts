import { Router } from 'express';

import { GetOrderById, GetOrders, CreateOrder, UpdateOrderStatus } from '../controllers/orderController';
import { CreateOpinion, GetOpinion } from '../controllers/opinionController';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get("/", authorize("KLIENT", "PRACOWNIK"), GetOrders);
router.get("/:id", authorize("KLIENT", "PRACOWNIK"), GetOrderById);

router.post("/", authorize("KLIENT"), CreateOrder);
router.patch("/:id/status", authorize("PRACOWNIK"), UpdateOrderStatus);

router.post("/:id/opinions", authorize("KLIENT"), CreateOpinion);
router.get("/:id/opinions", authorize("KLIENT", "PRACOWNIK"), GetOpinion);

export default router;
