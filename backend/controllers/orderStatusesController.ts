import { Request, Response } from "express";

import { OrderStatus } from "../models/OrderStatus";
import { ApiError } from "../utils/ApiError";

export const GetOrderStatuses = async (req: Request, res: Response) => {
  const result = await OrderStatus.find();

  return res.status(200).json(result);
};
