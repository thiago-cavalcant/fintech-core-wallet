import 'dotenv/config';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
url: 'postgresql://wallet_user:wallet_password@localhost:5433/wallet_db?schema=public'  },
});