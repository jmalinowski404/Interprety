import { Schema, model, Document, Types } from 'mongoose';

export interface IUser extends Document {
    login: string;
    passwordHash: string;
    role: Types.ObjectId;
}

const UserSchema = new Schema<IUser>({
    login: { type: String, required: true, unique: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    role: { type: Schema.Types.ObjectId, ref: 'Role', required: true },
});

export const User = model<IUser>('User', UserSchema);
