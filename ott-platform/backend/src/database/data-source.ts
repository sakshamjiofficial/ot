import 'dotenv/config';
import { DataSource } from 'typeorm';
import * as path from 'path';

export const AppDataSource = new DataSource({
  type:        'postgres',
  url:         process.env.DATABASE_URL,
  entities:    [path.join(__dirname, '../**/*.entity{.ts,.js}')],
  migrations:  [path.join(__dirname, './migrations/**{.ts,.js}')],
  synchronize: false,
  logging:     process.env.NODE_ENV !== 'production',
  ssl:         process.env.NODE_ENV === 'production'
    ? { rejectUnauthorized: false }
    : false,
});

export default AppDataSource;
