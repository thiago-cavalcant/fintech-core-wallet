import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { TransferDto } from './dto/transfer.dto';

@Injectable()
export class TransactionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
  ) {}

  async getBalance(walletId: string) {
    const credits = await this.prisma.entry.aggregate({
      where: { walletId, type: 'CREDIT' },
      _sum: { amountInCents: true },
    });

    const debits = await this.prisma.entry.aggregate({
      where: { walletId, type: 'DEBIT' },
      _sum: { amountInCents: true },
    });

    const totalCredits = credits._sum.amountInCents || BigInt(0);
    const totalDebits = debits._sum.amountInCents || BigInt(0);
    const balanceInCents = totalCredits - totalDebits;

    return {
      walletId,
      balanceInCents: balanceInCents.toString(),
      balance: Number(balanceInCents) / 100,
    };
  }

  async getStatement(walletId: string) {
    const entries = await this.prisma.entry.findMany({
      where: { walletId },
      include: {
        transaction: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return entries.map((entry) => ({
      id: entry.id,
      type: entry.type,
      amount: Number(entry.amountInCents) / 100,
      description: entry.transaction.description,
      date: entry.createdAt,
    }));
  }

  async transfer(
    senderUserId: string,
    transferDto: TransferDto,
    idempotencyKey?: string,
  ) {
    // 1. Verificação de Idempotência: se já processou essa chave, retorna o resultado salvo
    if (idempotencyKey) {
      const cachedResult = await this.redisService.get(`idempotency:${idempotencyKey}`);
      if (cachedResult) {
        return JSON.parse(cachedResult);
      }
    }

    const amountInCents = BigInt(Math.round(transferDto.amount * 100));

    if (amountInCents <= BigInt(0)) {
      throw new BadRequestException('O valor da transferência deve ser maior que zero');
    }

    const sender = await this.prisma.user.findUnique({
      where: { id: senderUserId },
      include: { wallet: true },
    });

    if (!sender || !sender.wallet) {
      throw new NotFoundException('Carteira do remetente não encontrada');
    }

    const receiver = await this.prisma.user.findUnique({
      where: { email: transferDto.receiverEmail },
      include: { wallet: true },
    });

    if (!receiver || !receiver.wallet) {
      throw new NotFoundException('Destinatário não encontrado');
    }

    if (sender.id === receiver.id) {
      throw new BadRequestException('Não é possível transferir para si mesmo');
    }

    const senderWalletId: string = sender.wallet.id;
    const receiverWalletId: string = receiver.wallet.id;
    const receiverName: string = receiver.name;

    // 2. Lock distribuído: impede que 2 requisições simultâneas gastem a mesma carteira
    const lockKey = `lock:wallet:${senderWalletId}`;
    const hasLock = await this.redisService.acquireLock(lockKey, 5);

    if (!hasLock) {
      throw new ConflictException('Outra transação está sendo processada nesta carteira. Tente novamente em alguns segundos.');
    }

    try {
      // 3. Transação atômica no banco de dados (Double-Entry Ledger)
      const result = await this.prisma.$transaction(async (tx) => {
        const credits = await tx.entry.aggregate({
          where: { walletId: senderWalletId, type: 'CREDIT' },
          _sum: { amountInCents: true },
        });

        const debits = await tx.entry.aggregate({
          where: { walletId: senderWalletId, type: 'DEBIT' },
          _sum: { amountInCents: true },
        });

        const totalCredits = credits._sum.amountInCents || BigInt(0);
        const totalDebits = debits._sum.amountInCents || BigInt(0);
        const currentBalance = totalCredits - totalDebits;

        if (currentBalance < amountInCents) {
          throw new BadRequestException('Saldo insuficiente para realizar a transferência');
        }

        const transaction = await tx.transaction.create({
          data: {
            idempotencyKey: idempotencyKey || null,
            amountInCents,
            description: transferDto.description || `Transferência para ${receiverName}`,
          },
        });

        await tx.entry.create({
          data: {
            walletId: senderWalletId,
            transactionId: transaction.id,
            type: 'DEBIT',
            amountInCents,
          },
        });

        await tx.entry.create({
          data: {
            walletId: receiverWalletId,
            transactionId: transaction.id,
            type: 'CREDIT',
            amountInCents,
          },
        });

        return {
          message: 'Transferência realizada com sucesso',
          transactionId: transaction.id,
          amount: transferDto.amount,
          receiver: receiverName,
        };
      });

      // 4. Salva a resposta no Redis para requisições com a mesma chave (24h TTL)
      if (idempotencyKey) {
        await this.redisService.setWithExpiry(
          `idempotency:${idempotencyKey}`,
          JSON.stringify(result),
          86400,
        );
      }

      return result;
    } finally {
      // 5. Libera o lock após a finalização
      await this.redisService.releaseLock(lockKey);
    }
  }

  async deposit(userId: string, amount: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { wallet: true },
    });

    if (!user || !user.wallet) {
      throw new NotFoundException('Carteira não encontrada');
    }

    const walletId: string = user.wallet.id;
    const amountInCents = BigInt(Math.round(amount * 100));

    return this.prisma.$transaction(async (tx) => {
      const transaction = await tx.transaction.create({
        data: {
          amountInCents,
          description: 'Depósito inicial / Recarga de saldo',
        },
      });

      await tx.entry.create({
        data: {
          walletId,
          transactionId: transaction.id,
          type: 'CREDIT',
          amountInCents,
        },
      });

      return {
        message: 'Depósito realizado com sucesso',
        amount,
      };
    });
  }
}