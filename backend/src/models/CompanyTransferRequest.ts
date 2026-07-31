import mongoose, { Schema, Document } from 'mongoose';

export interface ICompanyTransferRequest extends Document {
  companyId: mongoose.Types.ObjectId;
  companyName: string;
  fromOwnerType: 'branch' | 'tpo';
  fromOwnerId: string;
  toOwnerType: 'branch' | 'tpo';
  toOwnerId: string;
  requestedBy: mongoose.Types.ObjectId;
  providedHRDetails?: {
    hrName?: string;
    hrEmail?: string;
    hrPhone?: string;
    linkedinProfile?: string;
  };
  status: 'pending' | 'approved' | 'rejected';
  createdAt: Date;
  updatedAt: Date;
}

const CompanyTransferRequestSchema: Schema = new Schema(
  {
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true },
    companyName: { type: String, required: true },
    
    // Who currently owns it
    fromOwnerType: { type: String, enum: ['branch', 'tpo'], required: true },
    fromOwnerId: { type: String, required: true }, // Branch ObjectId string or TPO Category (e.g., 'Faculty', 'Staff')
    
    // Who is requesting it
    toOwnerType: { type: String, enum: ['branch', 'tpo'], required: true },
    toOwnerId: { type: String, required: true },
    
    requestedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    
    providedHRDetails: {
      hrName: { type: String },
      hrEmail: { type: String },
      hrPhone: { type: String },
      linkedinProfile: { type: String }
    },
    
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
      required: true
    }
  },
  { timestamps: true }
);

// Indexes for fast lookups
CompanyTransferRequestSchema.index({ toOwnerId: 1, status: 1 }); // For outgoing requests
CompanyTransferRequestSchema.index({ fromOwnerId: 1, status: 1 }); // For incoming requests
CompanyTransferRequestSchema.index({ companyId: 1, toOwnerId: 1 }, { unique: true, partialFilterExpression: { status: 'pending' } }); // Prevent duplicate pending requests for the same company by the same branch

export default mongoose.model<ICompanyTransferRequest>('CompanyTransferRequest', CompanyTransferRequestSchema);
