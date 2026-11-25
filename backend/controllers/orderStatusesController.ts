import { Request, Response } from "express";

import { OrderStatus } from "../models/OrderStatus";

export const GetOrderStatuses = async (req: Request, res: Response) => {
  try {
    const result = await OrderStatus.find();

    if (result.length < 1) {
      return res.status(404).type("application/problem+json").json({
        type: "about:blank",
        title: "Brak statusów.",
        status: 404,
        detail: "Brak statusów w bazie danych.",
        instance: req.originalUrl,
      });
    }

    return res.status(200).json(result);
  } catch (e) {
    console.log(e);

    return res.status(500).type("application/problem+json").json({
      type: "about:blank",
      title: "Internal Server Error",
      status: 500,
      detail: "Wystąpił nieoczekiwany błąd serwera podczas przetwarzania żądania.",
      instance: req.originalUrl,
    });
  }
};
