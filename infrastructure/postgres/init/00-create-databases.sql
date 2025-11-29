-- ============================================
-- Payment System Database Initialization
-- Creates all service databases and users
-- ============================================

-- Create users for each service
CREATE USER identity_user WITH PASSWORD 'identity_db_password';
CREATE USER account_user WITH PASSWORD 'account_db_password';
CREATE USER card_user WITH PASSWORD 'card_db_password';
CREATE USER transaction_user WITH PASSWORD 'transaction_db_password';
CREATE USER merchant_user WITH PASSWORD 'merchant_db_password';
CREATE USER settlement_user WITH PASSWORD 'settlement_db_password';
CREATE USER fraud_user WITH PASSWORD 'fraud_db_password';
CREATE USER developer_user WITH PASSWORD 'developer_db_password';
CREATE USER notification_user WITH PASSWORD 'notification_db_password';

-- Create databases
CREATE DATABASE identity_db OWNER identity_user;
CREATE DATABASE account_db OWNER account_user;
CREATE DATABASE card_db OWNER card_user;
CREATE DATABASE transaction_db OWNER transaction_user;
CREATE DATABASE merchant_db OWNER merchant_user;
CREATE DATABASE settlement_db OWNER settlement_user;
CREATE DATABASE fraud_db OWNER fraud_user;
CREATE DATABASE developer_db OWNER developer_user;
CREATE DATABASE notification_db OWNER notification_user;

-- ============================================
-- Identity Database Extensions
-- ============================================
\c identity_db
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- Account Database Extensions
-- ============================================
\c account_db
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- Card Database Extensions
-- ============================================
\c card_db
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- Transaction Database Extensions
-- ============================================
\c transaction_db
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- Merchant Database Extensions
-- ============================================
\c merchant_db
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- Settlement Database Extensions
-- ============================================
\c settlement_db
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- Fraud Database Extensions
-- ============================================
\c fraud_db
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- Developer Database Extensions
-- ============================================
\c developer_db
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- Notification Database Extensions
-- ============================================
\c notification_db
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Log completion
\echo 'All databases and users created successfully!'
