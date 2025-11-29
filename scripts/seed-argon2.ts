/**
 * Database Seed Script with Argon2 Password Hashing
 *
 * Run with: npx ts-node scripts/seed-argon2.ts
 *
 * Creates test users with credentials:
 *   Email: test@example.com / Password: Test123!@#
 *   Email: admin@example.com / Password: Admin123!@#
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

async function seed() {
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USER || 'payment_admin',
    password: process.env.DB_PASSWORD || 'payment_secret_password',
    database: process.env.DB_NAME || 'payment_system',
    synchronize: false,
    logging: true,
  });

  try {
    await dataSource.initialize();
    console.log('Connected to database');

    const queryRunner = dataSource.createQueryRunner();

    // Delete existing test users to update with correct hashes
    await queryRunner.query(
      `DELETE FROM users WHERE email IN ($1, $2)`,
      ['test@example.com', 'admin@example.com']
    );
    console.log('Cleared existing test users');

    // Create test user with Argon2 hash
    const testPasswordHash = await hashPassword('Test123!@#');
    const testExternalId = `usr_${Date.now()}_test`;

    await queryRunner.query(`
      INSERT INTO users (
        id, external_id, email, password_hash, first_name, last_name,
        status, kyc_status, email_verified, roles, kyc_tier, created_at, updated_at
      ) VALUES (
        gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW()
      )
    `, [
      testExternalId,
      'test@example.com',
      testPasswordHash,
      'Test',
      'User',
      'ACTIVE',
      'APPROVED',
      true,
      'user',
      1
    ]);

    console.log('\n✅ Test user created!');
    console.log('   Email:    test@example.com');
    console.log('   Password: Test123!@#');

    // Create admin user with Argon2 hash
    const adminPasswordHash = await hashPassword('Admin123!@#');
    const adminExternalId = `usr_${Date.now()}_admin`;

    await queryRunner.query(`
      INSERT INTO users (
        id, external_id, email, password_hash, first_name, last_name,
        status, kyc_status, email_verified, roles, kyc_tier, created_at, updated_at
      ) VALUES (
        gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW()
      )
    `, [
      adminExternalId,
      'admin@example.com',
      adminPasswordHash,
      'Admin',
      'User',
      'ACTIVE',
      'APPROVED',
      true,
      'admin,user',
      2
    ]);

    console.log('\n✅ Admin user created!');
    console.log('   Email:    admin@example.com');
    console.log('   Password: Admin123!@#');

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  Seed completed successfully with Argon2 hashes!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    await dataSource.destroy();
  } catch (error) {
    console.error('Seed error:', error);
    process.exit(1);
  }
}

seed();
