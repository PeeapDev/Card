/**
 * Seed All User Types
 * Run: npx tsx scripts/seed-all-users.ts
 *
 * Creates users for all roles with these credentials:
 *
 * Admin:     admin@example.com     / Admin123!@#
 * User:      user@example.com      / User123!@#
 * Merchant:  merchant@example.com  / Merchant123!@#
 * Developer: developer@example.com / Developer123!@#
 * Agent:     agent@example.com     / Agent123!@#
 */

import { DataSource } from 'typeorm';
import * as argon2 from 'argon2';

async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 4,
  });
}

interface UserSeed {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  roles: string;
  kycTier: number;
}

const users: UserSeed[] = [
  {
    email: 'admin@example.com',
    password: 'Admin123!@#',
    firstName: 'System',
    lastName: 'Administrator',
    roles: 'admin,user',
    kycTier: 3,
  },
  {
    email: 'user@example.com',
    password: 'User123!@#',
    firstName: 'Regular',
    lastName: 'User',
    roles: 'user',
    kycTier: 1,
  },
  {
    email: 'merchant@example.com',
    password: 'Merchant123!@#',
    firstName: 'Acme',
    lastName: 'Store',
    roles: 'merchant,user',
    kycTier: 2,
  },
  {
    email: 'developer@example.com',
    password: 'Developer123!@#',
    firstName: 'API',
    lastName: 'Developer',
    roles: 'developer,user',
    kycTier: 2,
  },
  {
    email: 'agent@example.com',
    password: 'Agent123!@#',
    firstName: 'Support',
    lastName: 'Agent',
    roles: 'agent,user',
    kycTier: 2,
  },
];

async function seed() {
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USER || 'payment_admin',
    password: process.env.DB_PASSWORD || 'payment_secret_password',
    database: process.env.DB_NAME || 'payment_system',
    synchronize: false,
    logging: false,
    ssl: process.env.DB_HOST?.includes('supabase') ? { rejectUnauthorized: false } : false,
  });

  await dataSource.initialize();
  console.log('Connected to database\n');

  const queryRunner = dataSource.createQueryRunner();

  console.log('Creating/Updating users...\n');
  console.log('=' .repeat(60));

  for (const user of users) {
    // Delete existing user
    await queryRunner.query(
      `DELETE FROM users WHERE email = $1`,
      [user.email]
    );

    // Create new user with hashed password
    const passwordHash = await hashPassword(user.password);
    const externalId = `usr_${Date.now()}_${user.roles.split(',')[0]}`;

    await queryRunner.query(`
      INSERT INTO users (
        id, external_id, email, password_hash, first_name, last_name,
        status, kyc_status, email_verified, roles, kyc_tier, created_at, updated_at
      ) VALUES (
        gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW()
      )
    `, [
      externalId,
      user.email,
      passwordHash,
      user.firstName,
      user.lastName,
      'ACTIVE',
      'APPROVED',
      true,
      user.roles,
      user.kycTier
    ]);

    const primaryRole = user.roles.split(',')[0].toUpperCase();
    console.log(`[${primaryRole.padEnd(10)}] ${user.email.padEnd(25)} | ${user.password}`);
  }

  console.log('=' .repeat(60));
  console.log('\nAll users created successfully!\n');

  console.log('Login URLs:');
  console.log('  Frontend: http://localhost:5173/login');
  console.log('  API:      POST http://localhost:3000/api/v1/auth/login\n');

  await dataSource.destroy();
}

seed().catch(console.error);
