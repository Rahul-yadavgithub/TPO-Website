export interface ISettingsRepository {
  getSettings(): Promise<any | null>;
}
