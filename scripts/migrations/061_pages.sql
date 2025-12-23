-- Create pages table for dynamic page builder
CREATE TABLE IF NOT EXISTS pages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Page identification
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,

  -- Page content (GrapesJS format)
  html TEXT, -- Rendered HTML
  css TEXT, -- Custom CSS
  components JSONB, -- GrapesJS components JSON
  styles JSONB, -- GrapesJS styles JSON
  assets JSONB DEFAULT '[]', -- GrapesJS assets (images, etc.)

  -- Page settings
  page_type VARCHAR(50) DEFAULT 'page', -- 'page', 'landing', 'blog', 'legal'
  template VARCHAR(100), -- Optional template name

  -- SEO
  meta_title VARCHAR(255),
  meta_description TEXT,
  meta_keywords TEXT,
  og_image VARCHAR(500),
  canonical_url VARCHAR(500),

  -- Status
  status VARCHAR(20) DEFAULT 'draft', -- 'draft', 'published', 'archived'
  is_homepage BOOLEAN DEFAULT false,
  show_in_nav BOOLEAN DEFAULT false,
  nav_order INTEGER DEFAULT 0,

  -- Access control
  require_auth BOOLEAN DEFAULT false,
  allowed_roles TEXT[], -- Array of roles that can access (if require_auth)

  -- Scheduling
  published_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,

  -- Metadata
  created_by UUID REFERENCES users(id),
  updated_by UUID REFERENCES users(id),

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for slug lookups
CREATE INDEX IF NOT EXISTS idx_pages_slug ON pages(slug);
CREATE INDEX IF NOT EXISTS idx_pages_status ON pages(status);
CREATE INDEX IF NOT EXISTS idx_pages_type ON pages(page_type);
CREATE INDEX IF NOT EXISTS idx_pages_nav ON pages(show_in_nav, nav_order) WHERE show_in_nav = true;

-- Create page versions table for revision history
CREATE TABLE IF NOT EXISTS page_versions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  page_id UUID NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,

  -- Content snapshot
  html TEXT,
  css TEXT,
  components JSONB,
  styles JSONB,

  -- Version metadata
  change_description TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(page_id, version_number)
);

CREATE INDEX IF NOT EXISTS idx_page_versions_page ON page_versions(page_id);

-- Create page_templates table for reusable templates
CREATE TABLE IF NOT EXISTS page_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  name VARCHAR(255) NOT NULL,
  description TEXT,
  thumbnail_url VARCHAR(500),
  category VARCHAR(100), -- 'landing', 'about', 'contact', 'pricing', etc.

  -- Template content
  html TEXT,
  css TEXT,
  components JSONB,
  styles JSONB,

  -- Settings
  is_system BOOLEAN DEFAULT false, -- System templates can't be deleted
  is_active BOOLEAN DEFAULT true,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert some default templates (using gen_random_uuid() for auto-generated IDs)
INSERT INTO page_templates (name, description, category, is_system, components, html, css) VALUES
(
  'Blank Page',
  'Start from scratch with a blank canvas',
  'basic',
  true,
  '[]',
  '',
  ''
),
(
  'Hero + Features',
  'Landing page with hero section and feature cards',
  'landing',
  true,
  '[{"type":"hero-section"},{"type":"features-section"}]',
  '<section class="hero-section bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-20 px-4"><div class="max-w-4xl mx-auto text-center"><h1 class="text-5xl font-bold mb-6">Your Headline Here</h1><p class="text-xl mb-8 opacity-90">Add your compelling description here</p><a href="#" class="inline-block bg-white text-indigo-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition">Get Started</a></div></section><section class="features-section py-20 px-4 bg-gray-50"><div class="max-w-6xl mx-auto"><h2 class="text-3xl font-bold text-center mb-12">Features</h2><div class="grid md:grid-cols-3 gap-8"><div class="bg-white p-6 rounded-xl shadow-sm"><h3 class="text-xl font-semibold mb-3">Feature 1</h3><p class="text-gray-600">Description of feature 1</p></div><div class="bg-white p-6 rounded-xl shadow-sm"><h3 class="text-xl font-semibold mb-3">Feature 2</h3><p class="text-gray-600">Description of feature 2</p></div><div class="bg-white p-6 rounded-xl shadow-sm"><h3 class="text-xl font-semibold mb-3">Feature 3</h3><p class="text-gray-600">Description of feature 3</p></div></div></div></section>',
  '.hero-section h1 { line-height: 1.2; } .features-section { } '
),
(
  'About Us',
  'Company about page with team section',
  'about',
  true,
  '[]',
  '<section class="py-20 px-4"><div class="max-w-4xl mx-auto"><h1 class="text-4xl font-bold mb-8">About Us</h1><p class="text-lg text-gray-600 mb-8">Tell your story here. Who are you? What do you do? Why do you do it?</p><div class="grid md:grid-cols-2 gap-8 mt-12"><div><h2 class="text-2xl font-semibold mb-4">Our Mission</h2><p class="text-gray-600">Describe your mission and values.</p></div><div><h2 class="text-2xl font-semibold mb-4">Our Vision</h2><p class="text-gray-600">Describe where you are heading.</p></div></div></div></section>',
  ''
),
(
  'Contact Page',
  'Contact form with company information',
  'contact',
  true,
  '[]',
  '<section class="py-20 px-4 bg-gray-50"><div class="max-w-6xl mx-auto"><div class="grid md:grid-cols-2 gap-12"><div><h1 class="text-4xl font-bold mb-6">Contact Us</h1><p class="text-gray-600 mb-8">Get in touch with our team</p><div class="space-y-4"><div class="flex items-center gap-3"><span class="text-indigo-600">📧</span><span>contact@example.com</span></div><div class="flex items-center gap-3"><span class="text-indigo-600">📞</span><span>+1 234 567 890</span></div><div class="flex items-center gap-3"><span class="text-indigo-600">📍</span><span>123 Street, City, Country</span></div></div></div><div class="bg-white p-8 rounded-xl shadow-sm"><form><div class="mb-4"><label class="block text-sm font-medium mb-2">Name</label><input type="text" class="w-full px-4 py-2 border rounded-lg" placeholder="Your name"></div><div class="mb-4"><label class="block text-sm font-medium mb-2">Email</label><input type="email" class="w-full px-4 py-2 border rounded-lg" placeholder="your@email.com"></div><div class="mb-4"><label class="block text-sm font-medium mb-2">Message</label><textarea class="w-full px-4 py-2 border rounded-lg" rows="4" placeholder="Your message"></textarea></div><button type="submit" class="w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 transition">Send Message</button></form></div></div></div></section>',
  ''
),
(
  'Pricing Page',
  'Pricing tiers with feature comparison',
  'pricing',
  true,
  '[]',
  '<section class="py-20 px-4"><div class="max-w-6xl mx-auto text-center"><h1 class="text-4xl font-bold mb-4">Simple Pricing</h1><p class="text-gray-600 mb-12">Choose the plan that works for you</p><div class="grid md:grid-cols-3 gap-8"><div class="bg-white border rounded-xl p-8"><h3 class="text-xl font-semibold mb-2">Starter</h3><p class="text-gray-500 mb-4">For individuals</p><div class="text-4xl font-bold mb-6">$9<span class="text-lg font-normal text-gray-500">/mo</span></div><ul class="text-left space-y-3 mb-8"><li>✓ Feature 1</li><li>✓ Feature 2</li><li>✓ Feature 3</li></ul><button class="w-full py-3 border-2 border-indigo-600 text-indigo-600 rounded-lg font-semibold hover:bg-indigo-50 transition">Get Started</button></div><div class="bg-indigo-600 text-white rounded-xl p-8 transform scale-105"><h3 class="text-xl font-semibold mb-2">Pro</h3><p class="opacity-80 mb-4">For teams</p><div class="text-4xl font-bold mb-6">$29<span class="text-lg font-normal opacity-80">/mo</span></div><ul class="text-left space-y-3 mb-8"><li>✓ Everything in Starter</li><li>✓ Feature 4</li><li>✓ Feature 5</li></ul><button class="w-full py-3 bg-white text-indigo-600 rounded-lg font-semibold hover:bg-gray-100 transition">Get Started</button></div><div class="bg-white border rounded-xl p-8"><h3 class="text-xl font-semibold mb-2">Enterprise</h3><p class="text-gray-500 mb-4">For large orgs</p><div class="text-4xl font-bold mb-6">Custom</div><ul class="text-left space-y-3 mb-8"><li>✓ Everything in Pro</li><li>✓ Dedicated support</li><li>✓ Custom features</li></ul><button class="w-full py-3 border-2 border-indigo-600 text-indigo-600 rounded-lg font-semibold hover:bg-indigo-50 transition">Contact Us</button></div></div></div></section>',
  ''
)
ON CONFLICT DO NOTHING;

-- Enable RLS
ALTER TABLE pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE page_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE page_templates ENABLE ROW LEVEL SECURITY;

-- Policies for pages
CREATE POLICY "Public can read published pages" ON pages
  FOR SELECT USING (status = 'published' AND (published_at IS NULL OR published_at <= NOW()) AND (expires_at IS NULL OR expires_at > NOW()));

CREATE POLICY "Admins can manage pages" ON pages
  FOR ALL USING (true);

-- Policies for page_versions
CREATE POLICY "Admins can manage page versions" ON page_versions
  FOR ALL USING (true);

-- Policies for page_templates
CREATE POLICY "Anyone can read active templates" ON page_templates
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage templates" ON page_templates
  FOR ALL USING (true);
