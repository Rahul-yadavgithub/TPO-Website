import mongoose, { Schema, Document } from 'mongoose';

export interface ITPOPerson extends Document {
  name: string;
  designation: string;
  type: 'Faculty' | 'Staff';
  status: 'active' | 'replaced';
  replacedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const TPOPersonSchema: Schema = new Schema(
  {
    name: { type: String, required: true },
    designation: { type: String, required: true },
    type: { type: String, enum: ['Faculty', 'Staff'], required: true },
    status: { type: String, enum: ['active', 'replaced'], default: 'active' },
    replacedBy: { type: Schema.Types.ObjectId, ref: 'TPOPerson' }
  },
  { timestamps: true }
);

export default mongoose.models.TPOPerson || mongoose.model<ITPOPerson>('TPOPerson', TPOPersonSchema);
