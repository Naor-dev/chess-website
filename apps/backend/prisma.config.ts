import 'dotenv/config';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  earlyAccess: true,
  schema: 'prisma/schema.prisma',

  // Use process.env instead of env() to avoid throwing during prisma generate
  // when DATABASE_URL is not set (e.g., in CI during pnpm install)
  datasource: {
    url: process.env.DATABASE_URL,
  },
});
