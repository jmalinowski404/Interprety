import { Router, Request, Response, NextFunction } from 'express';

import { CreateProduct, GetProductById, GetProducts, UpdateProduct, CreateSEODescription } from '../controllers/productController';

const router = Router();

router.get("/", GetProducts);
router.get("/:id", GetProductById);
router.get("/:id/seo-description", CreateSEODescription);
router.post("/", CreateProduct);
router.patch("/:id", UpdateProduct);

export default router;