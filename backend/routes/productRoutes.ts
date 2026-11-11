import { Router, Request, Response, NextFunction } from 'express';

import { CreateProduct, GetProducts, UpdateProduct } from '../controllers/productController';

const router = Router();

router.get("/", GetProducts);
router.post("/", CreateProduct);
router.patch("/:id", UpdateProduct);

export default router;