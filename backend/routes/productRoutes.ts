import { Router, Request, Response, NextFunction } from 'express';

import { CreateProduct, GetProductById, GetProducts, UpdateProduct } from '../controllers/productController';

const router = Router();

router.get("/", GetProducts);
router.get("/:id", GetProductById);
router.post("/", CreateProduct);
router.patch("/:id", UpdateProduct);

export default router;