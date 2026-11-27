import { Schema, model, Document } from 'mongoose';

export const ROLES = ["KLIENT", "PRACOWNIK"] as const;
export type RoleName = typeof ROLES[number];

export interface IRole extends Document {
    name: RoleName;
}

const RoleSchema = new Schema<IRole>({
    name: { type: String, required: true, unique: true, enum: ROLES },
});

export const Role = model<IRole>('Role', RoleSchema);
