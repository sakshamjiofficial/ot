import { registerAs } from '@nestjs/config';

export const databaseConfig = registerAs('database', () => ({
  url:         process.env.DATABASE_URL,
  host:        process.env.POSTGRES_HOST || 'postgres',
  port:        parseInt(process.env.POSTGRES_PORT || '5432', 10),
  name:        process.env.POSTGRES_DB || 'ott_db',
  user:        process.env.POSTGRES_USER || 'ott_user',
  password:    process.env.POSTGRES_PASSWORD,
  poolSize:    parseInt(process.env.DB_POOL_SIZE || '20', 10),
  logging:     process.env.NODE_ENV === 'development',
}));
