import { Schema, model, Document } from 'mongoose';

export interface IOrderStatus extends Document {
    name: string;
}

const OrderStatusSchema = new Schema<IOrderStatus>({
    name: { type: String, required: true, unique: true }, 
});

export const OrderStatus = model<IOrderStatus>('OrderStatus', OrderStatusSchema);