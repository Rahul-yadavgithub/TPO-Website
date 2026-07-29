import mongoose, { Schema, Document } from 'mongoose';

export interface IDuplicatePreviousCompany extends Document {
  originalCompanyId: mongoose.Types.ObjectId;
  companyName: string;
  normalizedName: string;
  academicYear: string;
  hrName?: string;
  hrEmail?: string;
  hrPhone?: string;
  section: string;
  extraData?: Record<string, any>;
  status: 'pending' | 'resolved';
  createdAt: Date;
  updatedAt: Date;
}

const DuplicatePreviousCompanySchema: Schema = new Schema({
  originalCompanyId: { type: Schema.Types.ObjectId, ref: 'PreviousCompany', required: true },
  companyName: { type: String, required: true },
  normalizedName: { type: String, required: true },
  academicYear: { type: String, required: true },
  hrName: { type: String },
  hrEmail: { type: String },
  hrPhone: { type: String },
  section: { type: String, required: true, default: 'Uncategorized' },
  extraData: { type: Schema.Types.Mixed, default: {} },
  status: { type: String, enum: ['pending', 'resolved'], default: 'pending' }
}, { timestamps: true, collection: 'DuplicatePreviousCompany' });

export const DuplicatePreviousCompany = mongoose.models.DuplicatePreviousCompany || mongoose.model<IDuplicatePreviousCompany>('DuplicatePreviousCompany', DuplicatePreviousCompanySchema);
