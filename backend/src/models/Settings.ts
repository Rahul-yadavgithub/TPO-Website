import mongoose, { Schema, Document } from 'mongoose';

export interface ISettings extends Document {
  currentAcademicYearSheetId: string;
  mtechCurrentAcademicYearSheetId: string;
  pastAcademicYearSheetId: string;
  serviceAccountEmail: string; // Stored just for UI display
  lastSyncDate?: Date;
  totalSynced: number;
  pastLastSyncDate?: Date;
  pastTotalSynced: number;
  portalLogoUrl?: string;
}

const SettingsSchema: Schema = new Schema(
  {
    currentAcademicYearSheetId: { type: String, default: '' },
    mtechCurrentAcademicYearSheetId: { type: String, default: '' },
    pastAcademicYearSheetId: { type: String, default: '' },
    serviceAccountEmail: { type: String, default: '' },
    lastSyncDate: { type: Date },
    totalSynced: { type: Number, default: 0 },
    pastLastSyncDate: { type: Date },
    pastTotalSynced: { type: Number, default: 0 },
    portalLogoUrl: { type: String, default: '' },
  },
  { timestamps: true }
);

export default mongoose.model<ISettings>('Settings', SettingsSchema);
