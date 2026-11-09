import { Schema, model, Document, Types } from 'mongoose';

export interface IOrderItem {
    product: Types.ObjectId;
    quantity: number;
    unitPrice: number;
}

export interface IOrder extends Document {
    createdAt: Date;
    approvedAt: Date | null;
    status: Types.ObjectId;
    username: string;
    email: string;
    phoneNumber: string;
    items: IOrderItem[];
}

const OrderItemSchema = new Schema<IOrderItem>({
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    quantity: { type: Number, required: true, validate:{
        validator: (v: number) => Number.isInteger(v) && v > 0,
        message: 'Ilość musi być liczbą całkowitą dodatnią',
    }},
    unitPrice: { type: Number, required: true, min: 0 },
    },
    { _id: false }
);

const OrderSchema = new Schema<IOrder>({
    createdAt: { type: Date, default: Date.now },
    approvedAt: { type: Date, default: null },
    status: { type: Schema.Types.ObjectId, ref: 'OrderStatus', required: true },
    username: { type: String, required: true },
    email: {
            type: String,
            required: true,
            trim: true,
            match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Niepoprawny adres email'],
        },
        phoneNumber: {
            type: String,
            required: true,
            trim: true,
            match: [/^\+?[0-9 \-]{9,15}$/, 'Niepoprawny numer telefonu'],
        },
        items: {
            type: [OrderItemSchema],
            validate: {
                validator: (v: IOrderItem[]) => v.length > 0,
                message: 'Zamówienie musi zawierać co najmniej jeden produkt',
            },
        },
});

export const Order = model<IOrder>('Order', OrderSchema);   