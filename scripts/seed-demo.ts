/**
 * Create demo user with simple password
 * Run: npx tsx scripts/seed-demo.ts
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
    logging: false,
  });

  await dataSource.initialize();
  console.log('Connected to database');

  const queryRunner = dataSource.createQueryRunner();

  // Simple password that works with curl: Password1$
  const testPasswordHash = await hashPassword('Password1$');
  const testExternalId = `usr_${Date.now()}_demo`;

  await queryRunner.query(
    `DELETE FROM users WHERE email = $1`,
    ['demo@example.com']
  );

  await queryRunner.query(`
    INSERT INTO users (
      id, external_id, email, password_hash, first_name, last_name,
      status, kyc_status, email_verified, roles, kyc_tier, created_at, updated_at
    ) VALUES (
      gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW()
    )
  `, [
    testExternalId,
    'demo@example.com',
    testPasswordHash,
    'Demo',
    'User',
    'ACTIVE',
    'APPROVED',
    true,
    'user',
    1
  ]);

  console.log('\n✅ Demo user created!');
  console.log('   Email:    demo@example.com');
  console.log('   Password: Password1$\n');

  await dataSource.destroy();
}

seed().catch(console.error);
