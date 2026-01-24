/**
 * Card Service Database Configuration
 *
 * This service uses its own dedicated database, separate from the main Supabase database.
 * This allows for:
 * - Independent scaling of card operations
 * - Isolated security boundaries for sensitive card data
 * - Separate backup and disaster recovery policies
 * - PCI DSS compliance isolation
 */

import { registerAs } from '@nestjs/config';

export default registerAs('database', () => ({
  type: 'postgres',
  host: process.env.CARD_DB_HOST || process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.CARD_DB_PORT || process.env.DB_PORT || '5432', 10),
  username: process.env.CARD_DB_USER || process.env.DB_USER || 'card_user',
  password: process.env.CARD_DB_PASSWORD || process.env.DB_PASSWORD || 'card_pass',
  database: process.env.CARD_DB_NAME || process.env.DB_NAME || 'card_db',

  // Connection pool settings
  extra: {
    max: parseInt(process.env.CARD_DB_POOL_SIZE || '20', 10),
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  },

  // SSL settings for production
  ssl: process.env.CARD_DB_SSL === 'true' ? {
    rejectUnauthorized: process.env.CARD_DB_SSL_REJECT_UNAUTHORIZED !== 'false',
    ca: process.env.CARD_DB_SSL_CA,
  } : false,

  // TypeORM specific settings
  synchronize: process.env.NODE_ENV === 'development',
  logging: process.env.NODE_ENV === 'development' ? ['error', 'warn', 'query'] : ['error'],

  // Migration settings
  migrations: ['dist/migrations/*.js'],
  migrationsRun: process.env.CARD_DB_AUTO_MIGRATE === 'true',
}));

// Supabase connection for the main database (read-only for user/wallet lookups)
export const mainDatabaseConfig = registerAs('mainDatabase', () => ({
  url: process.env.SUPABASE_URL,
  serviceKey: process.env.SUPABASE_SERVICE_KEY,
  anonKey: process.env.SUPABASE_ANON_KEY,
}));
