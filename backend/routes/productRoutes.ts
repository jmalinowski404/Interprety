import { Router, Request, Response, NextFunction } from 'express';

import { CreateProduct, GetProducts } from '../controllers/productController';

const router = Router();

router.get("/", GetProducts);
router.post("/", CreateProduct);

export default router;