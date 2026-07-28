import mongoose, { Schema, Document } from 'mongoose';

export interface IPreviousCompanyContactRequest extends Document {
  companyId: mongoose.Types.ObjectId;
  companyName: string;
  branchId: mongoose.Types.ObjectId;
  requestedBy: mongoose.Types.ObjectId;
  status: 'pending' | 'approved' | 'rejected';
  rejectionReason?: string;
  adminProvidedContact?: {
    name?: string;
    email?: string;
    phone?: string;
    notes?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const PreviousCompanyContactRequestSchema: Schema = new Schema({
  companyId: { type: Schema.Types.ObjectId, ref: 'PreviousCompany', required: true },
  companyName: { type: String, required: true },
  branchId: { type: Schema.Types.ObjectId, ref: 'Branch', required: true },
  requestedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  rejectionReason: { type: String },
  adminProvidedContact: {
    name: { type: String },
    email: { type: String },
    phone: { type: String },
    notes: { type: String }
  }
}, { timestamps: true });

export default mongoose.models.PreviousCompanyContactRequest || mongoose.model<IPreviousCompanyContactRequest>('PreviousCompanyContactRequest', PreviousCompanyContactRequestSchema);
