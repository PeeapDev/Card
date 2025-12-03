import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://akiecgwcxadcpqlvntmf.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFraWVjZ3djeGFkY3BxbHZudG1mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQyODMzMzIsImV4cCI6MjA3OTg1OTMzMn0.L2ePGMJRjBqHS-M1d9mxys7I9bZv93YYr9dzQzCQINE';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

function normalizePhoneNumber(phone) {
  if (!phone) return '';
  let cleaned = phone.replace(/[^\d+]/g, '');
  if (cleaned.startsWith('+')) cleaned = cleaned.substring(1);
  if (cleaned.startsWith('232')) cleaned = cleaned.substring(3);
  if (!cleaned.startsWith('0') && cleaned.length === 8) cleaned = '0' + cleaned;
  if (cleaned.length === 8) cleaned = '0' + cleaned;
  return cleaned;
}

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { action, ...data } = req.body || {};

  try {
    switch (action) {
      case 'login':
        return await handleLogin(data, res);
      case 'register':
        return await handleRegister(data, res);
      case 'profile':
        return await handleGetProfile(data, res);
      case 'wallets':
        return await handleGetWallets(data, res);
      case 'cards':
        return await handleGetCards(data, res);
      case 'transactions':
        return await handleGetTransactions(data, res);
      default:
        return res.status(400).json({ error: 'Invalid action' });
    }
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}

async function handleLogin(data, res) {
  const { identifier, password } = data;

  if (!identifier || !password) {
    return res.status(400).json({ error: 'Identifier and password are required' });
  }

  const isEmail = identifier.includes('@');
  let dbUser = null;

  if (!isEmail) {
    const normalizedPhone = normalizePhoneNumber(identifier);
    const { data: users } = await supabase
      .from('users')
      .select('*')
      .eq('phone', normalizedPhone)
      .limit(1);

    if (users && users.length > 0) {
      dbUser = users[0];
    } else {
      const { data: users2 } = await supabase
        .from('users')
        .select('*')
        .eq('phone', identifier)
        .limit(1);
      if (users2 && users2.length > 0) {
        dbUser = users2[0];
      }
    }
  }

  if (!dbUser) {
    const { data: users } = await supabase
      .from('users')
      .select('*')
      .eq('email', identifier)
      .limit(1);
    if (users && users.length > 0) {
      dbUser = users[0];
    }
  }

  if (!dbUser) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  if (dbUser.password_hash !== password) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  await supabase
    .from('users')
    .update({ last_login_at: new Date().toISOString() })
    .eq('id', dbUser.id);

  const tokens = generateTokens(dbUser);
  const user = mapUser(dbUser);

  return res.status(200).json({ user, tokens });
}

async function handleRegister(data, res) {
  const { email, password, phone, firstName, lastName } = data;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const { data: existing } = await supabase
    .from('users')
    .select('id')
    .eq('email', email)
    .limit(1);

  if (existing && existing.length > 0) {
    return res.status(409).json({ error: 'Email already registered' });
  }

  const externalId = `usr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  const { data: newUser, error } = await supabase
    .from('users')
    .insert({
      external_id: externalId,
      email,
      phone: phone ? normalizePhoneNumber(phone) : null,
      password_hash: password,
      first_name: firstName,
      last_name: lastName,
      status: 'ACTIVE',
      kyc_status: 'NOT_STARTED',
      email_verified: false,
      roles: 'user',
      kyc_tier: 0,
    })
    .select()
    .single();

  if (error || !newUser) {
    return res.status(500).json({ error: error?.message || 'Failed to create user' });
  }

  const tokens = generateTokens(newUser);
  const user = mapUser(newUser);

  return res.status(201).json({ user, tokens });
}

async function handleGetProfile(data, res) {
  const { userId } = data;
  const { data: users } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .limit(1);

  if (!users || users.length === 0) {
    return res.status(404).json({ error: 'User not found' });
  }

  return res.status(200).json({ user: mapUser(users[0]) });
}

async function handleGetWallets(data, res) {
  const { userId } = data;
  const { data: wallets } = await supabase
    .from('wallets')
    .select('*')
    .eq('user_id', userId);

  return res.status(200).json({ wallets: wallets || [] });
}

async function handleGetCards(data, res) {
  const { userId } = data;
  const { data: cards } = await supabase
    .from('cards')
    .select('*')
    .eq('user_id', userId);

  return res.status(200).json({ cards: cards || [] });
}

async function handleGetTransactions(data, res) {
  const { userId, limit = 50 } = data;
  const { data: transactions } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  return res.status(200).json({ transactions: transactions || [] });
}

function generateTokens(user) {
  const accessToken = Buffer.from(JSON.stringify({
    userId: user.id,
    email: user.email,
    roles: user.roles?.split(',') || ['user'],
    exp: Date.now() + 3600000
  })).toString('base64');

  const refreshToken = Buffer.from(JSON.stringify({
    userId: user.id,
    exp: Date.now() + 604800000
  })).toString('base64');

  return { accessToken, refreshToken, expiresIn: 3600 };
}

function mapUser(dbUser) {
  let roles = ['user'];
  if (dbUser.roles) {
    roles = dbUser.roles.split(',').map(r => r.trim());
  }

  return {
    id: dbUser.id,
    email: dbUser.email,
    firstName: dbUser.first_name,
    lastName: dbUser.last_name,
    phone: dbUser.phone,
    roles,
    kycStatus: dbUser.kyc_status,
    kycTier: dbUser.kyc_tier,
    emailVerified: dbUser.email_verified,
    phoneVerified: dbUser.phone_verified,
    status: dbUser.status,
    createdAt: dbUser.created_at,
  };
}
