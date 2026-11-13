import { Request, Response } from "express";

import { OrderStatus } from "../models/OrderStatus";

export const GetOrderStatuses = async (req: Request, res: Response) => {
  try {
    const result = await OrderStatus.find();

    if (result.length < 1) {
      return res.status(404).json({
        message: "Brak statusów w bazie danych",
      });
    }

    return res.status(200).json(result);
  } catch (e) {
    return res.status(500).json({
      message: "Wystąpił błąd serwera.",
      error: e,
    });
  }
};
