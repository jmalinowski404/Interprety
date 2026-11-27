import mongoose from "mongoose";
import "../models/Category";
import "../models/Product";
import "../models/Order";
import "../models/User";
import "../models/Opinion";
import { OrderStatus } from "../models/OrderStatus";
import { Role, ROLES } from "../models/Role";

export const ORDER_STATUSES = ["NIEZATWIERDZONE", "ZATWIERDZONE", "ZREALIZOWANE", "ANULOWANE"] as const;

export const initDatabaseStructure = async () => {
    for (const model of Object.values(mongoose.models)) {
        await model.createCollection().catch(() => undefined);
        await model.syncIndexes();
    }
};

export const ensureDictionaries = async () => {
    await Role.bulkWrite(
        ROLES.map((name) => ({ updateOne: { filter: { name }, update: { $setOnInsert: { name } }, upsert: true } }))
    );
    await OrderStatus.bulkWrite(
        ORDER_STATUSES.map((name) => ({ updateOne: { filter: { name }, update: { $setOnInsert: { name } }, upsert: true } }))
    );
};

export const initDatabase = async () => {
    await initDatabaseStructure();
    await ensureDictionaries();
};
