import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'ana@email.com', description: 'E-mail do usuário' })
  @IsEmail({}, { message: 'Forneça um e-mail válido' })
  email: string;

  @ApiProperty({ example: '123456', description: 'Senha de acesso' })
  @IsString()
  @IsNotEmpty({ message: 'A senha é obrigatória' })
  password: string;
}