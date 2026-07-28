import mongoose, { Schema, Document } from 'mongoose';

export interface IPreviousCompany extends Document {
  companyName: string;
  normalizedName: string;
  academicYear: string;
  hrName?: string;
  hrEmail?: string;
  hrPhone?: string;
  notes?: string;
  syncStatus?: 'pending' | 'synced' | 'failed';
  lastSynced?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const PreviousCompanySchema: Schema = new Schema({
  companyName: { type: String, required: true },
  normalizedName: { type: String, required: true, index: true },
  academicYear: { type: String, required: true },
  hrName: { type: String },
  hrEmail: { type: String },
  hrPhone: { type: String },
  notes: { type: String },
  syncStatus: { type: String, enum: ['pending', 'synced', 'failed'], default: 'pending' },
  lastSynced: { type: Date }
}, { timestamps: true });

PreviousCompanySchema.index({ companyName: 'text' });

export default mongoose.models.PreviousCompany || mongoose.model<IPreviousCompany>('PreviousCompany', PreviousCompanySchema);
