/**
 * Database Seed Script
 *
 * Run with: npx ts-node scripts/seed.ts
 *
 * Creates test user with credentials:
 *   Email: test@example.com
 *   Password: Test123!@#
 */

import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';

// Simple seed script that connects directly to PostgreSQL
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

    // Check if test user exists
    const existingUser = await queryRunner.query(
      `SELECT id FROM users WHERE email = $1`,
      ['test@example.com']
    );

    if (existingUser.length > 0) {
      console.log('Test user already exists');
      await dataSource.destroy();
      return;
    }

    // Create test user
    const passwordHash = await bcrypt.hash('Test123!@#', 12);
    const externalId = `usr_${Date.now()}_test`;

    await queryRunner.query(`
      INSERT INTO users (
        id, external_id, email, password_hash, first_name, last_name,
        status, kyc_status, email_verified, roles, created_at, updated_at
      ) VALUES (
        gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW()
      )
    `, [
      externalId,
      'test@example.com',
      passwordHash,
      'Test',
      'User',
      'ACTIVE',
      'APPROVED',
      true,
      'user'
    ]);

    console.log('\n✅ Test user created successfully!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Email:    test@example.com');
    console.log('Password: Test123!@#');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    await dataSource.destroy();
  } catch (error) {
    console.error('Seed error:', error);
    process.exit(1);
  }
}

seed();
