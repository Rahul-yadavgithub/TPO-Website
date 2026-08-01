export interface ITransactionManager {
  runInTransaction<T>(callback: (session: any) => Promise<T>): Promise<T>;
}
