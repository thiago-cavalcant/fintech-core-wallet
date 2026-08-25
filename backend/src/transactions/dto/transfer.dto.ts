import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString } from 'class-validator';

export class TransferDto {
  @ApiProperty({
    example: 'carlos@email.com',
    description: 'E-mail do destinatário da transferência',
  })
  @IsEmail({}, { message: 'O e-mail do destinatário deve ser válido' })
  @IsNotEmpty({ message: 'O e-mail do destinatário é obrigatório' })
  receiverEmail: string;

  @ApiProperty({
    example: 50.0,
    description: 'Valor em Reais a ser transferido (maior que zero)',
  })
  @IsNumber({}, { message: 'O valor deve ser numérico' })
  @IsPositive({ message: 'O valor transferido deve ser maior que zero' })
  amount: number;

  @ApiPropertyOptional({
    example: 'Pagamento do almoço',
    description: 'Descrição ou motivo da transação',
  })
  @IsString()
  @IsOptional()
  description?: string;
}