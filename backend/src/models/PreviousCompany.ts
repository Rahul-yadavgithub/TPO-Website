import mongoose, { Schema, Document } from 'mongoose';

export interface IPreviousCompany extends Document {
  companyName: string;
  normalizedName: string;
  academicYear: string;
  hrName?: string;
  hrEmail?: string;
  hrPhone?: string;
  additionalContacts?: Array<{
    hrName: string;
    hrEmail: string;
    hrPhone: string;
    sourceSheet: string;
    academicYear: string;
  }>;
  notes?: string;
  syncStatus?: 'pending' | 'synced' | 'failed';
  lastSynced?: Date;
  contactStatus?: 'not_contacted' | 'requested' | 'contacted';
  contactedByBranchId?: mongoose.Types.ObjectId;
  contactedByBranchName?: string;
  contactedByTprName?: string;
  updatedByTprName?: string;
  is_verified_by_admin?: boolean;
  section: string;
  extraData?: Record<string, any>;
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
  additionalContacts: [{
    hrName: { type: String },
    hrEmail: { type: String },
    hrPhone: { type: String },
    sourceSheet: { type: String },
    academicYear: { type: String }
  }],
  notes: { type: String },
  syncStatus: { type: String, enum: ['pending', 'synced', 'failed'], default: 'pending' },
  lastSynced: { type: Date },
  contactStatus: { type: String, enum: ['not_contacted', 'requested', 'contacted'], default: 'not_contacted' },
  contactedByBranchId: { type: Schema.Types.ObjectId, ref: 'Branch' },
  contactedByBranchName: { type: String },
  contactedByTprName: { type: String },
  updatedByTprName: { type: String },
  is_verified_by_admin: { type: Boolean, default: false },
  section: { type: String, required: true, default: 'Uncategorized' },
  extraData: { type: Schema.Types.Mixed, default: {} }
}, { timestamps: true, collection: 'PreviousCompany' });

PreviousCompanySchema.index({ companyName: 'text' });

export default mongoose.models.PreviousCompany || mongoose.model<IPreviousCompany>('PreviousCompany', PreviousCompanySchema);
