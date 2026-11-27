import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { afterAll, afterEach, beforeAll, beforeEach } from "vitest";
import { Category } from "../models/Category";
import { OrderStatus } from "../models/OrderStatus";
import bcrypt from "bcryptjs";
import { Role, ROLES, RoleName } from "../models/Role";
import { User } from "../models/User";
import { signToken } from "../utils/jwt";

process.env.JWT_SECRET ??= "test-secret";

export const STATUSES = ["NIEZATWIERDZONE", "ZATWIERDZONE", "ZREALIZOWANE", "ANULOWANE"];

export const setupTestDb = () => {
    let mongo: MongoMemoryServer;

    beforeAll(async () => {
        mongo = await MongoMemoryServer.create();
        await mongoose.connect(mongo.getUri());
    });

    beforeEach(async () => {
        await OrderStatus.insertMany(STATUSES.map((name) => ({ name })));
        await Role.insertMany(ROLES.map((name) => ({ name })));
    });

    afterEach(async () => {
        await mongoose.connection.db!.dropDatabase();
    });

    afterAll(async () => {
        await mongoose.disconnect();
        await mongo.stop();
    });
};

export const createCategory = async (name = "Telefony") => {
    const category = await Category.create({ name });
    return category.id as string;
};

export const productData = (
    category: string,
    overrides: Partial<{ name: string; description: string; price: unknown; weight: unknown }> = {}
) => ({
    name: "iPhone 18",
    description: "Najnowszy egzemplarz od Apple.",
    price: 3499.99,
    weight: 1.03,
    category,
    ...overrides,
});

export const createUser = async (login: string, password: string, role: RoleName) => {
    const roleDoc = await Role.findOne({ name: role });
    const user = await User.create({ login, passwordHash: await bcrypt.hash(password, 4), role: roleDoc!._id });
    return user.id as string;
};

export const authHeader = async (login: string, role: RoleName) => {
    const id = await createUser(login, "haslo123", role);
    return { Authorization: `Bearer ${signToken({ sub: id, login, role })}` };
};
