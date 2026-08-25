import {
  Body,
  Controller,
  Get,
  Headers,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiHeader,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { TransactionsService } from './transactions.service';
import { TransferDto } from './dto/transfer.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Wallet & Transactions')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('wallet')
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Get('balance')
  @ApiOperation({ summary: 'Consultar saldo atual calculado pelo Ledger' })
  @ApiResponse({ status: 200, description: 'Retorna o saldo em Reais e centavos.' })
  async getBalance(@Req() req: any) {
    return this.transactionsService.getBalance(req.user.walletId);
  }

  @Get('statement')
  @ApiOperation({ summary: 'Consultar extrato financeiro (entradas e saídas)' })
  @ApiResponse({ status: 200, description: 'Lista das últimas transações.' })
  async getStatement(@Req() req: any) {
    return this.transactionsService.getStatement(req.user.walletId);
  }

  @Post('transfer')
  @ApiOperation({ summary: 'Realizar transferência atômica entre carteiras' })
  @ApiHeader({
    name: 'x-idempotency-key',
    required: false,
    description: 'Chave UUID única para evitar execuções duplicadas',
  })
  @ApiResponse({ status: 201, description: 'Transferência concluída com sucesso.' })
  @ApiResponse({ status: 400, description: 'Saldo insuficiente ou parâmetros inválidos.' })
  async transfer(
    @Req() req: any,
    @Body() transferDto: TransferDto,
    @Headers('x-idempotency-key') idempotencyKey?: string,
  ) {
    return this.transactionsService.transfer(
      req.user.sub,
      transferDto,
      idempotencyKey,
    );
  }

  @Post('deposit')
  @ApiOperation({ summary: 'Depositar saldo na conta (útil para testes)' })
  @ApiResponse({ status: 201, description: 'Depósito registrado no Ledger.' })
  async deposit(@Req() req: any, @Body('amount') amount: number) {
    return this.transactionsService.deposit(req.user.sub, amount);
  }
}