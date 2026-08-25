import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private client: Redis;

  onModuleInit() {
    // Porta 6380 configurada no docker-compose.yml
    const redisHost = process.env.REDIS_HOST || 'localhost';
    const redisPort = Number(process.env.REDIS_PORT) || 6380;

    this.client = new Redis({
      host: redisHost,
      port: redisPort,
      lazyConnect: false,
    });
  }

  async onModuleDestroy() {
    await this.client.quit();
  }

  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  // Define um valor com tempo de expiração em segundos (TTL)
  async setWithExpiry(key: string, value: string, ttlInSeconds: number = 86400): Promise<void> {
    await this.client.set(key, value, 'EX', ttlInSeconds);
  }

  // Trava distribuída simples (Lock) para impedir concorrência na mesma carteira
  async acquireLock(lockKey: string, ttlInSeconds: number = 5): Promise<boolean> {
    const result = await this.client.set(lockKey, 'locked', 'EX', ttlInSeconds, 'NX');
    return result === 'OK';
  }

  async releaseLock(lockKey: string): Promise<void> {
    await this.client.del(lockKey);
  }
}