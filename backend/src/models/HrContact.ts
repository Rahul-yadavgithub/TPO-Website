import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IHrContactHistory {
  name?: string;
  mobile?: string;
  email?: string;
  designation?: string;
  linkedin_url?: string;
  replaced_at: Date;
}

export interface IHrContact extends Document {
  company_id: Types.ObjectId;
  name?: string;
  mobile?: string;
  email?: string;
  designation?: string;
  linkedin_url?: string;
  is_incorrect?: boolean;
  is_auto_updated?: boolean;
  auto_updated_at?: Date;
  history?: IHrContactHistory[];
  
  // New fields for background queue
  pending_update?: IHrContactHistory;
  last_checked_at?: Date;
  last_check_status?: 'no_changes' | 'update_found' | 'failed';
  
  createdAt: Date;
  updatedAt: Date;
}

const HrContactHistorySchema: Schema = new Schema({
  name: { type: String },
  mobile: { type: String },
  email: { type: String },
  designation: { type: String },
  linkedin_url: { type: String },
  replaced_at: { type: Date, default: Date.now }
}, { _id: false });

const HrContactSchema: Schema = new Schema(
  {
    company_id: { type: Schema.Types.ObjectId, ref: 'Company', required: true },
    name: { type: String },
    mobile: { type: String },
    email: { type: String },
    designation: { type: String },
    linkedin_url: { type: String },
    is_incorrect: { type: Boolean, default: false },
    is_auto_updated: { type: Boolean, default: false },
    auto_updated_at: { type: Date },
    history: { type: [HrContactHistorySchema], default: [] },
    
    // New fields for background queue
    pending_update: { type: HrContactHistorySchema, default: null },
    last_checked_at: { type: Date },
    last_check_status: { type: String, enum: ['no_changes', 'update_found', 'failed'] }
  },
  { timestamps: true }
);

// Primary lookup: HR contact by company — used on every company detail load
HrContactSchema.index({ company_id: 1 }, { unique: true });

export default mongoose.model<IHrContact>('HrContact', HrContactSchema);
