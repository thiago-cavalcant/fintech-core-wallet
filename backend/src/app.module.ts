import { Module } from '@nestjs/common';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { TransactionsModule } from './transactions/transactions.module';
import { RedisModule } from './redis/redis.module';

@Module({
  imports: [
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // Janela de 1 minuto (em milissegundos)
        limit: 60,  // Máximo de 60 requisições por IP por minuto
      },
    ]),
    PrismaModule,
    UsersModule,
    AuthModule,
    TransactionsModule,
    RedisModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}