import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 1. Headers de segurança via Helmet (XSS, Clickjacking, MIME sniffing)
  app.use(
    helmet({
      contentSecurityPolicy: false, // Permite que a interface do Swagger funcione sem bloqueio de assets
      crossOriginEmbedderPolicy: false,
    }),
  );

  // 2. Sanitização e validação estrita de dados de entrada (rejeita campos não mapeados)
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // 3. Filtro global para não expor stack traces ou erros internos de SQL
  app.useGlobalFilters(new AllExceptionsFilter());

  // 4. Configuração controlada de CORS
  // Permite conexões do Front-end nas portas 3000 e 3001
  app.enableCors({
    origin: ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:3001', 'http://127.0.0.1:3001'],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    credentials: true,
  });

  // 5. Configuração Swagger OpenAPI
  const config = new DocumentBuilder()
    .setTitle('Fintech Core Wallet & Ledger API')
    .setDescription(
      'API financeira com arquitetura de partidas dobradas (Double-Entry Ledger), idempotência, Throttling e proteção contra ataques comuns.',
    )
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Insira o token JWT retornado no login',
        in: 'header',
      },
      'JWT-auth',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  const PORT = process.env.PORT || 3333;
  await app.listen(PORT);
  console.log(`🚀 Servidor rodando em: http://localhost:${PORT}`);
  console.log(`📑 Documentação Swagger em: http://localhost:${PORT}/api`);
}
bootstrap();