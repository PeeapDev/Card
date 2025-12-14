/**
 * Jest Environment Setup
 *
 * This file runs BEFORE any tests or modules are loaded.
 * Used to mock import.meta.env for Vite compatibility.
 */

// Mock import.meta.env for Vite
global.import = {
  meta: {
    env: {
      VITE_SUPABASE_URL: 'https://test.supabase.co',
      VITE_SUPABASE_ANON_KEY: 'test-anon-key',
      VITE_API_URL: 'https://api.test.com',
      VITE_API_BASE_URL: 'https://api.test.com',
      MODE: 'test',
      DEV: false,
      PROD: false,
    },
  },
};
