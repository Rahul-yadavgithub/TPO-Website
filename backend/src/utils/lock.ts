import { connection as redisClient } from '../config/redis';

export async function acquireLock(key: string, ttlSeconds: number = 30): Promise<boolean> {
  const result = await redisClient.set(key, 'locked', 'EX', ttlSeconds, 'NX');
  return result === 'OK';
}

export async function releaseLock(key: string): Promise<void> {
  await redisClient.del(key);
}
