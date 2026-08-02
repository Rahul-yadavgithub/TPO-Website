import mongoose, { Schema, Document } from 'mongoose';

export interface IPreviousCompany extends Document {
  companyName: string;
  normalizedName: string;
  academicYear: string;
  hrName?: string;
  hrEmail?: string;
  hrPhone?: string;
  primary_contact_verified?: boolean;
  primary_contact_flagged?: boolean;
  additionalContacts?: Array<{
    hrName: string;
    hrEmail: string;
    hrPhone: string;
    sourceSheet: string;
    academicYear: string;
    isVerified?: boolean;
    isFlagged?: boolean;
  }>;
  notes?: string;
  syncStatus?: 'pending' | 'synced' | 'failed';
  lastSynced?: Date;
  contactStatus?: 'not_contacted' | 'requested' | 'contacted';
  contactedByBranchId?: mongoose.Types.ObjectId;
  contactedByBranchName?: string;
  contactedByTprName?: string;
  contactedByTprEmail?: string;
  updatedByTprName?: string;
  is_verified_by_admin?: boolean;
  assignedTPO?: string;
  assignedTpoType?: string;
  section: string;
  extraData?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  
  // Manual Email Tracking
  emailDeliveryStatus?: 'pending' | 'sent' | 'failed';
  emailFailureReason?: string;
  emailStatusUpdatedAt?: Date;
  emailStatusUpdatedBy?: string;
}

const PreviousCompanySchema: Schema = new Schema({
  companyName: { type: String, required: true },
  normalizedName: { type: String, required: true, index: true },
  academicYear: { type: String, required: true },
  hrName: { type: String },
  hrEmail: { type: String },
  hrPhone: { type: String },
  primary_contact_verified: { type: Boolean, default: false },
  primary_contact_flagged: { type: Boolean, default: false },
  additionalContacts: [{
    hrName: { type: String },
    hrEmail: { type: String },
    hrPhone: { type: String },
    sourceSheet: { type: String },
    academicYear: { type: String },
    isVerified: { type: Boolean, default: false },
    isFlagged: { type: Boolean, default: false }
  }],
  notes: { type: String },
  syncStatus: { type: String, enum: ['pending', 'synced', 'failed'], default: 'pending' },
  lastSynced: { type: Date },
  contactStatus: { type: String, enum: ['not_contacted', 'requested', 'contacted'], default: 'not_contacted' },
  contactedByBranchId: { type: Schema.Types.ObjectId, ref: 'Branch' },
  contactedByBranchName: { type: String },
  contactedByTprName: { type: String },
  contactedByTprEmail: { type: String },
  updatedByTprName: { type: String },
  is_verified_by_admin: { type: Boolean, default: false },
  assignedTPO: { type: String },
  assignedTpoType: { type: String },
  section: { type: String, required: true, default: 'Uncategorized' },
  extraData: { type: Schema.Types.Mixed, default: {} },
  
  // Manual Email Tracking
  emailDeliveryStatus: { type: String, enum: ['pending', 'sent', 'failed'], default: 'pending' },
  emailFailureReason: { type: String },
  emailStatusUpdatedAt: { type: Date },
  emailStatusUpdatedBy: { type: String }
}, { timestamps: true, collection: 'PreviousCompany' });

PreviousCompanySchema.index({ companyName: 'text' });

export default mongoose.models.PreviousCompany || mongoose.model<IPreviousCompany>('PreviousCompany', PreviousCompanySchema);
