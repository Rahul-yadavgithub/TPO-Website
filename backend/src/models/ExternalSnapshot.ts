import mongoose, { Schema, Document } from 'mongoose';

export interface IExternalSnapshot extends Document {
  companyServiceId?: string; // UUID when available
  normalizedName: string;
  companyName: string;
  website?: string;
  description?: string;
  category?: string;
  foundedYear?: string;
  teamSize?: string;
  fundingStage?: string;
  startupSignals?: string[];
  hiringType?: string;
  salaryBand?: string;
  stipendBand?: string;
  placementScore?: number;
  confidenceScore?: number;
  driveStatus?: string;
  currentYear?: {
    ctc?: string;
    eligibleBranches?: string[];
  };
  rawExternalData?: Record<string, any>; // Flexible payload storage
  lastFetchedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ExternalSnapshotSchema: Schema = new Schema(
  {
    companyServiceId: { type: String, index: true, sparse: true },
    normalizedName: { type: String, required: true, index: true, unique: true },
    companyName: { type: String, required: true },
    website: { type: String },
    description: { type: String },
    category: { type: String },
    foundedYear: { type: String },
    teamSize: { type: String },
    fundingStage: { type: String },
    startupSignals: [{ type: String }],
    hiringType: { type: String },
    salaryBand: { type: String },
    stipendBand: { type: String },
    placementScore: { type: Number, default: 0 },
    confidenceScore: { type: Number, default: 0 },
    driveStatus: { type: String },
    currentYear: {
      ctc: { type: String },
      eligibleBranches: [{ type: String }]
    },
    rawExternalData: { type: Schema.Types.Mixed },
    lastFetchedAt: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

export default mongoose.models.ExternalSnapshot || mongoose.model<IExternalSnapshot>('ExternalSnapshot', ExternalSnapshotSchema);
