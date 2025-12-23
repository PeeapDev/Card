const https = require('https');

const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFraWVjZ3djeGFkY3BxbHZudG1mIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDI4MzMzMiwiZXhwIjoyMDc5ODU5MzMyfQ.q8R8t_aHiMReEIpeJIV-m0RCEA-n0_RDOtTX8bLJgYs';

const sql = `
-- Create site_settings table for frontend customization
CREATE TABLE IF NOT EXISTS site_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- General Settings
  site_name VARCHAR(255) DEFAULT 'Peeap',
  site_tagline VARCHAR(500),
  site_description TEXT,
  logo_url VARCHAR(500),
  favicon_url VARCHAR(500),
  contact_email VARCHAR(255),
  contact_phone VARCHAR(50),
  address TEXT,
  social_links JSONB DEFAULT '{}',

  -- Theme Settings
  primary_color VARCHAR(20) DEFAULT '#4F46E5',
  secondary_color VARCHAR(20) DEFAULT '#9333EA',
  accent_color VARCHAR(20) DEFAULT '#EC4899',
  dark_mode_enabled BOOLEAN DEFAULT true,
  custom_css TEXT,

  -- Hero Section
  hero_badge_text VARCHAR(255) DEFAULT 'Sierra Leone''s #1 Payment Gateway',
  hero_title VARCHAR(255) DEFAULT 'Accept Payments',
  hero_title_highlight VARCHAR(255) DEFAULT 'Anywhere',
  hero_subtitle TEXT DEFAULT 'Peeap makes it easy for businesses in Sierra Leone to accept Mobile Money, Card payments, and QR codes.',
  hero_cta_primary_text VARCHAR(100) DEFAULT 'Create Merchant Account',
  hero_cta_primary_link VARCHAR(255) DEFAULT '/register',
  hero_cta_secondary_text VARCHAR(100) DEFAULT 'Watch Demo',
  hero_cta_secondary_link VARCHAR(255) DEFAULT '/register?type=agent',
  hero_background_image VARCHAR(500),

  -- Features Section
  features_title VARCHAR(255) DEFAULT 'Everything You Need to',
  features_title_highlight VARCHAR(255) DEFAULT 'Accept Payments',
  features_subtitle TEXT DEFAULT 'A complete payment solution designed for Sierra Leone''s businesses.',
  features_list JSONB DEFAULT '[
    {"icon": "Smartphone", "title": "Mobile Money", "description": "Accept Orange Money, Africell Money and more through our Monime integration.", "gradient": "from-orange-500 to-amber-500"},
    {"icon": "CreditCard", "title": "Peeap Cards", "description": "Accept payments from Peeap prepaid cardholders - instant settlement.", "gradient": "from-blue-500 to-cyan-500"},
    {"icon": "QrCode", "title": "QR Code Payments", "description": "Generate QR codes for in-store payments. Customers scan with Peeap app.", "gradient": "from-purple-500 to-pink-500"},
    {"icon": "Shield", "title": "Secure & Compliant", "description": "Bank-grade encryption, fraud detection, and regulatory compliance built-in.", "gradient": "from-green-500 to-emerald-500"},
    {"icon": "Code", "title": "Simple Integration", "description": "Add payments to your site with just a few lines of code. Full API docs available.", "gradient": "from-indigo-500 to-violet-500"},
    {"icon": "TrendingUp", "title": "Real-Time Dashboard", "description": "Track payments, view analytics, and manage your business from one place.", "gradient": "from-rose-500 to-red-500"}
  ]',

  -- Payment Methods
  payment_methods JSONB DEFAULT '[
    {"name": "Mobile Money", "providers": ["Orange Money", "Africell Money"], "icon": "Smartphone", "color": "bg-gradient-to-br from-orange-400 to-orange-600", "enabled": true},
    {"name": "Peeap Card", "providers": ["Virtual Cards", "Physical Cards"], "icon": "CreditCard", "color": "bg-gradient-to-br from-blue-400 to-indigo-600", "enabled": true},
    {"name": "QR Code", "providers": ["Peeap App Scan"], "icon": "QrCode", "color": "bg-gradient-to-br from-purple-400 to-purple-600", "enabled": true}
  ]',

  -- Pricing Section
  pricing_title VARCHAR(255) DEFAULT 'Simple, Transparent',
  pricing_title_highlight VARCHAR(255) DEFAULT 'Pricing',
  pricing_subtitle TEXT DEFAULT 'Pay only for what you use. No monthly fees, no setup costs.',
  pricing_tiers JSONB DEFAULT '[
    {"name": "Starter", "description": "For small businesses getting started", "fee": "2.9% + Le 0.30", "features": ["Accept all payment methods", "Standard payout (T+2)", "Basic dashboard", "Email support", "Up to Le 10,000/month"], "cta": "Start Free", "ctaLink": "/register", "highlighted": false},
    {"name": "Growth", "description": "For growing businesses", "fee": "2.5% + Le 0.20", "features": ["Everything in Starter", "Next-day payout (T+1)", "Advanced analytics", "Priority support", "Up to Le 100,000/month", "Webhook notifications"], "cta": "Get Started", "ctaLink": "/register", "highlighted": true},
    {"name": "Enterprise", "description": "For large scale operations", "fee": "Custom", "features": ["Everything in Growth", "Same-day payout", "Dedicated account manager", "24/7 phone support", "Unlimited volume", "Custom integration support", "SLA guarantee"], "cta": "Contact Sales", "ctaLink": "/contact", "highlighted": false}
  ]',

  -- Stats Section
  stats JSONB DEFAULT '[
    {"value": 500, "suffix": "+", "label": "Merchants"},
    {"value": 1, "prefix": "Le ", "suffix": "B+", "label": "Processed"},
    {"value": 99.9, "suffix": "%", "label": "Uptime"},
    {"value": 24, "suffix": "/7", "label": "Support"}
  ]',

  -- CTA Section
  cta_title VARCHAR(255) DEFAULT 'Ready to Start',
  cta_title_highlight VARCHAR(255) DEFAULT 'Accepting Payments?',
  cta_subtitle TEXT DEFAULT 'Create your merchant account today. No setup fees, no monthly minimums. Start accepting payments in minutes.',
  cta_button_text VARCHAR(100) DEFAULT 'Create Free Account',
  cta_button_link VARCHAR(255) DEFAULT '/register',

  -- Footer Section
  footer_description TEXT DEFAULT 'Sierra Leone''s leading payment gateway. Accept Mobile Money, Cards, and QR payments with ease.',
  footer_links JSONB DEFAULT '[
    {"title": "Product", "links": [{"name": "Features", "href": "#features"}, {"name": "Pricing", "href": "#pricing"}, {"name": "Calculator", "href": "#calculator"}, {"name": "API Docs", "href": "/docs/SDK_INTEGRATION.md"}]},
    {"title": "Company", "links": [{"name": "About Us", "href": "#"}, {"name": "Careers", "href": "#"}, {"name": "Blog", "href": "#"}, {"name": "Contact", "href": "#"}]},
    {"title": "Legal", "links": [{"name": "Privacy Policy", "href": "#"}, {"name": "Terms of Service", "href": "#"}, {"name": "Security", "href": "#"}]}
  ]',
  footer_copyright VARCHAR(255) DEFAULT '2025 Peeap. All rights reserved.',

  -- Navigation Menu
  nav_links JSONB DEFAULT '[
    {"label": "Features", "href": "#features"},
    {"label": "Pricing", "href": "#pricing"},
    {"label": "Calculator", "href": "#calculator"}
  ]',
  show_sign_in BOOLEAN DEFAULT true,
  show_get_started BOOLEAN DEFAULT true,

  -- Integration Section
  integration_title VARCHAR(255) DEFAULT 'Integrate in',
  integration_title_highlight VARCHAR(255) DEFAULT 'Minutes',
  integration_subtitle TEXT DEFAULT 'Add Peeap to your website with just a few lines of code. Works with any platform.',
  integration_features JSONB DEFAULT '["Simple JavaScript SDK", "REST API for custom integrations", "Hosted checkout page - no code needed", "Webhook notifications"]',
  sdk_code_example TEXT,

  -- SEO Settings
  meta_title VARCHAR(255),
  meta_description TEXT,
  meta_keywords TEXT,
  og_image VARCHAR(500),

  -- Misc Settings
  maintenance_mode BOOLEAN DEFAULT false,
  maintenance_message TEXT,
  google_analytics_id VARCHAR(50),
  custom_head_scripts TEXT,
  custom_body_scripts TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create default settings record with a fixed UUID (singleton pattern)
INSERT INTO site_settings (id)
VALUES ('00000000-0000-0000-0000-000000000002')
ON CONFLICT (id) DO NOTHING;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_site_settings_updated_at ON site_settings(updated_at);

-- Add RLS policies (allow public read, admin write)
ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read site settings (public landing page)
CREATE POLICY IF NOT EXISTS "Allow public read site_settings" ON site_settings
  FOR SELECT USING (true);

-- Allow authenticated admins to update
CREATE POLICY IF NOT EXISTS "Allow admin update site_settings" ON site_settings
  FOR UPDATE USING (true);

CREATE POLICY IF NOT EXISTS "Allow admin insert site_settings" ON site_settings
  FOR INSERT WITH CHECK (true);
`;

const postData = JSON.stringify({ query: sql });

const options = {
  hostname: 'akiecgwcxadcpqlvntmf.supabase.co',
  port: 443,
  path: '/pg/query',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'apikey': SERVICE_KEY,
    'Authorization': `Bearer ${SERVICE_KEY}`,
    'Content-Length': Buffer.byteLength(postData)
  }
};

const req = https.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    console.log('Response:', data);
    if (res.statusCode === 200) {
      console.log('\n✅ Site settings table created successfully!');
    } else {
      console.log('\n❌ Error creating site settings table');
    }
  });
});

req.on('error', (e) => console.error('Error:', e.message));
req.write(postData);
req.end();
