import { ISettingsRepository } from './ISettingsRepository';
import Settings from '../../../models/Settings';

export class MongoSettingsRepository implements ISettingsRepository {
  async getSettings(): Promise<any | null> {
    return Settings.findOne().lean().exec();
  }
}
