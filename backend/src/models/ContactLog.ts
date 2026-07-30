import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IContactLog extends Document {
  company_id: Types.ObjectId;
  branch_id?: Types.ObjectId;
  contact_date?: Date;
  channel?: string;
  outcome?: string;
  notes?: string;
  created_by?: string;
  show_to_tpr?: boolean;
  tpo_name?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ContactLogSchema: Schema = new Schema(
  {
    company_id: { type: Schema.Types.ObjectId, ref: 'Company', required: true },
    branch_id: { type: Schema.Types.ObjectId, ref: 'Branch' },
    contact_date: { type: Date },
    channel: { type: String },
    outcome: { type: String },
    notes: { type: String },
    created_by: { type: String },
    show_to_tpr: { type: Boolean, default: false },
    tpo_name: { type: String }
  },
  { timestamps: true }
);

ContactLogSchema.index({ company_id: 1, contact_date: -1 });

export default mongoose.model<IContactLog>('ContactLog', ContactLogSchema);
