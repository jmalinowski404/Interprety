import { Schema, model, Document } from 'mongoose';

export interface IProduct extends Document {
    name: string;
    description: string;
    price: number;
    weight: number;
    category: Schema.Types.ObjectId;
}

const positive = {
    validator: (v: number) => v > 0,
    message: (props: { path: string }) => `Pole ${props.path} musi być większe od zera`,
};

const ProductSchema = new Schema<IProduct>({
    name: { type: String, required: true, unique: true },
    description: { type: String, required: true },
    price: { type: Number, required: true, validate: positive },
    weight: { type: Number, required: true, validate: positive },
    category: { type: Schema.Types.ObjectId, ref: 'Category', required: true },
});

export const Product = model<IProduct>('Product', ProductSchema);