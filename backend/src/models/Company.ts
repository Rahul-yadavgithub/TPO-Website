import mongoose, { Schema, Document } from 'mongoose';

export enum CompanyStatus {
  DISCOVERED = 'DISCOVERED',
  VALIDATING = 'VALIDATING',
  ENRICHING = 'ENRICHING',
  PENDING_REVIEW = 'PENDING_REVIEW',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  CONTACTED = 'CONTACTED',
  RESPONDED = 'RESPONDED'
}

export interface ICompany extends Document {
  // Core Identity
  companyName: string;
  normalizedName: string;
  companyHash?: string;
  website?: string;
  description?: string;
  category?: string;
  foundedYear?: string;
  teamSize?: string;
  fundingStage?: string;
  startupSignals: string[];

  // Discovery & Source
  source: {
    platform: string;
    sourceUrl: string;
    careersUrl?: string;
    discoveryMethod?: 'DISCOVERY' | 'DIRECT';
    discoveredAt: Date;
  };
  discoveryHistory: Array<{
    platform: string;
    sourceUrl: string;
    discoveredAt: Date;
  }>;

  // Hiring & Placement Intelligence
  hiringType?: string;
  internshipAvailable?: boolean;
  fresherHiring?: boolean;
  salaryRawText?: string;
  salaryBand?: string;
  stipendRawText?: string;
  stipendBand?: string;
  placementScore: number;
  placementPriority?: 'HIGH' | 'MEDIUM' | 'LOW';
  confidenceScore: number;
  aiConfidence: number;

  // Status & Outreach
  status: CompanyStatus;
  outreachStatus?: string;
  lastContactDate?: Date;
  nextFollowupDate?: Date;
  contactOwner?: string;
  contactOwnerEmail?: string;
  responseStatus?: string;
  notes?: string;

  // Contact Discovery
  hrEmail?: string;
  talentAcquisitionEmail?: string;
  founderEmail?: string;
  linkedinCompanyUrl?: string;
  linkedinRecruiterUrl?: string;
  careersUrl?: string;
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
    incorrect_marked_by?: mongoose.Types.ObjectId;
    history?: Array<{
      name?: string;
      email?: string;
      mobile?: string;
      designation?: string;
      replaced_at?: Date;
    }>;
  }>;

  createdAt: Date;
  updatedAt: Date;

  // Review & Confirmation
  review_status?: 'scanned' | 'approved';
  confirmation_status?: 'pending' | 'confirmed' | 'not_confirmed';
  contact_status?: 'not_contacted' | 'contacted';
  contact_outcome?: 'call_again' | 'rejected' | 'accepted' | 'brochure_jnf' | 'tpo_talk' | null;
  data_source?: 'scanned' | 'excel_import' | 'manual_ai';

  // Placement Specifics
  drive_type?: string;
  role?: string;
  package?: string;
  expected_month?: string;
  expected_year?: string;
  academic_year?: string;
  
  // Auditing
  reviewed_at?: Date;
  reviewed_by?: string;
  pending_delete?: boolean;

  // Branch Assignment & Sync
  assignedBranch?: string;
  assignedBranchId?: mongoose.Types.ObjectId;
  assignedTPO?: string;
  tpoType?: 'Faculty' | 'Staff';
  program?: string;
  syncStatus: 'pending' | 'synced' | 'failed';
  lastSynced?: Date;
  is_verified_by_admin?: boolean;

  // Manual Email Tracking
  emailDeliveryStatus?: 'pending' | 'sent' | 'failed';
  emailFailureReason?: string;
  emailStatusUpdatedAt?: Date;
  emailStatusUpdatedBy?: string;
}

const CompanySchema: Schema = new Schema(
  {
    // Core Identity
    companyName: { type: String, required: true },
    normalizedName: { type: String, required: true },
    companyHash: { type: String, unique: true, sparse: true },
    website: { type: String },
    description: { type: String },
    category: { type: String },
    foundedYear: { type: String },
    teamSize: { type: String },
    fundingStage: { type: String },
    startupSignals: [{ type: String }],

    // Discovery & Source
    source: {
      platform: { type: String, required: true },
      sourceUrl: { type: String, required: true },
      careersUrl: { type: String },
      discoveryMethod: { type: String, enum: ['DISCOVERY', 'DIRECT'] },
      discoveredAt: { type: Date, default: Date.now }
    },
    discoveryHistory: [
      {
        platform: { type: String, required: true },
        sourceUrl: { type: String, required: true },
        discoveredAt: { type: Date, default: Date.now }
      }
    ],

    // Hiring & Placement Intelligence
    hiringType: { type: String },
    internshipAvailable: { type: Boolean, default: false },
    fresherHiring: { type: Boolean, default: false },
    salaryRawText: { type: String },
    salaryBand: { type: String },
    stipendRawText: { type: String },
    stipendBand: { type: String },
    placementScore: { type: Number, default: 0 },
    placementPriority: { type: String, enum: ['HIGH', 'MEDIUM', 'LOW'] },
    confidenceScore: { type: Number, default: 0 },
    aiConfidence: { type: Number, default: 0 },

    // Status & Outreach
    status: {
      type: String,
      enum: Object.values(CompanyStatus),
      default: CompanyStatus.DISCOVERED,
      index: true
    },
    outreachStatus: { type: String, default: 'NOT_CONTACTED' },
    lastContactDate: { type: Date },
    nextFollowupDate: { type: Date },
    contactOwner: { type: String },
    contactOwnerEmail: { type: String },
    responseStatus: { type: String },
    notes: { type: String },

    // Contact Discovery
    hrEmail: { type: String },
    talentAcquisitionEmail: { type: String },
    founderEmail: { type: String },
    linkedinCompanyUrl: { type: String },
    linkedinRecruiterUrl: { type: String },
    careersUrl: { type: String },
    primary_contact_verified: { type: Boolean, default: false },
    primary_contact_flagged: { type: Boolean, default: false },
    additionalContacts: [{
      hrName: { type: String },
      hrEmail: { type: String },
      hrPhone: { type: String },
      sourceSheet: { type: String },
      academicYear: { type: String },
      isVerified: { type: Boolean, default: false },
      isFlagged: { type: Boolean, default: false },
      incorrect_marked_by: { type: Schema.Types.ObjectId, ref: 'Branch' },
      history: [{
        name: String,
        email: String,
        mobile: String,
        designation: String,
        replaced_at: Date
      }]
    }],

    // Review & Confirmation
    review_status: { type: String, enum: ['scanned', 'approved'] },
    confirmation_status: { type: String, enum: ['pending', 'confirmed', 'not_confirmed'] },
    contact_status: { type: String, enum: ['not_contacted', 'contacted'] },
    contact_outcome: { type: String, enum: ['call_again', 'rejected', 'accepted', 'brochure_jnf', 'tpo_talk', null] },
    data_source: { type: String, enum: ['scanned', 'excel_import', 'manual_ai'] },

    // Placement Specifics
    drive_type: { type: String },
    role: { type: String },
    package: { type: String },
    expected_month: { type: String },
    expected_year: { type: String },
    academic_year: { type: String },

    // Auditing
    reviewed_at: { type: Date },
    reviewed_by: { type: String },
    pending_delete: { type: Boolean, default: false },

    // Branch & TPO Assignment & Sync
    assignedBranch: {
      type: String,
      default: 'Pending Assignment'
    },
    assignedBranchId: {
      type: Schema.Types.ObjectId,
      ref: 'Branch'
    },
    assignedTPO: { type: String },
    tpoType: { type: String, enum: ['Faculty', 'Staff'] },
    program: {
      type: String,
      enum: ['B.Tech', 'M.Tech', 'Open to all', '']
    },
    syncStatus: { type: String, enum: ['pending', 'synced', 'failed'], default: 'pending' },
    lastSynced: { type: Date },
    is_verified_by_admin: { type: Boolean, default: false },

    // Manual Email Tracking
    emailDeliveryStatus: { type: String, enum: ['pending', 'sent', 'failed'], default: 'pending' },
    emailFailureReason: { type: String },
    emailStatusUpdatedAt: { type: Date },
    emailStatusUpdatedBy: { type: String }
  },
  { timestamps: true }
);

// ── High-frequency query indexes ────────────────────────────────────────────
// List page: filter by status, sort by createdAt — covers 90% of all queries
CompanySchema.index({ status: 1, createdAt: -1 });

// Duplicate detection: exact lookup by normalizedName
CompanySchema.index({ normalizedName: 1 });
// Note: companyHash already has unique:true on the field — no duplicate index needed

// Sync center: fetch pending/synced by branch
CompanySchema.index({ assignedBranch: 1, syncStatus: 1 });
CompanySchema.index({ syncStatus: 1, lastSynced: -1 });

// Optimizations for Contact List endpoints
CompanySchema.index({ assignedBranch: 1, confirmation_status: 1, nextFollowupDate: 1 });
CompanySchema.index({ assignedBranch: 1, contact_status: 1 });

// Dashboard counters (covered queries — no doc fetch needed)
CompanySchema.index({ fresherHiring: 1 });
CompanySchema.index({ internshipAvailable: 1 });
CompanySchema.index({ placementPriority: 1 });
CompanySchema.index({ confidenceScore: 1 });

// Placement score sort for listings
CompanySchema.index({ placementScore: -1 });

// Review workflow
CompanySchema.index({ review_status: 1, confirmation_status: 1, academic_year: 1, drive_type: 1, role: 1 });

// Contact workflow
CompanySchema.index({ contact_status: 1, contact_outcome: 1 });

// Text search on company name (case-insensitive regex queries)
CompanySchema.index({ companyName: 'text' });

export default mongoose.model<ICompany>('Company', CompanySchema);
