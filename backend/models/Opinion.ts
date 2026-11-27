import { Schema, model, Document, Types } from 'mongoose';

export interface IOpinion extends Document {
    order: Types.ObjectId;
    user: Types.ObjectId;
    rating: number;
    content: string;
    createdAt: Date;
}

const OpinionSchema = new Schema<IOpinion>({
    order: { type: Schema.Types.ObjectId, ref: 'Order', required: true, unique: true },
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    rating: {
        type: Number,
        required: true,
        min: 1,
        max: 5,
        validate: { validator: Number.isInteger, message: 'Ocena musi być liczbą całkowitą' },
    },
    content: { type: String, required: true, trim: true },
    createdAt: { type: Date, default: Date.now, immutable: true },
});

export const Opinion = model<IOpinion>('Opinion', OpinionSchema);
