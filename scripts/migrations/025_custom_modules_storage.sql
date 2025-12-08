-- ============================================================================
-- CUSTOM MODULE STORAGE
-- Support for uploading and managing custom module packages
-- ============================================================================

-- Module packages table - stores uploaded module zip files
CREATE TABLE IF NOT EXISTS module_packages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    module_code VARCHAR(100) NOT NULL,
    version VARCHAR(20) NOT NULL,
    file_path VARCHAR(500) NOT NULL,       -- Storage path in Supabase
    file_size INTEGER NOT NULL,            -- Size in bytes
    checksum VARCHAR(64),                  -- SHA256 hash for integrity
    manifest JSONB NOT NULL,               -- Extracted manifest.json content
    status VARCHAR(20) DEFAULT 'pending',  -- 'pending', 'installed', 'failed', 'deprecated'
    install_error TEXT,                    -- Error message if installation failed
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    installed_at TIMESTAMP WITH TIME ZONE,
    uploaded_by UUID REFERENCES users(id),

    UNIQUE(module_code, version)
);

CREATE INDEX IF NOT EXISTS idx_module_packages_code ON module_packages(module_code);
CREATE INDEX IF NOT EXISTS idx_module_packages_status ON module_packages(status);

-- Module files table - tracks individual files within a module
CREATE TABLE IF NOT EXISTS module_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    package_id UUID NOT NULL REFERENCES module_packages(id) ON DELETE CASCADE,
    file_path VARCHAR(500) NOT NULL,       -- Relative path within module
    file_type VARCHAR(50) NOT NULL,        -- 'manifest', 'service', 'route', 'component', 'asset', etc.
    storage_path VARCHAR(500) NOT NULL,    -- Full storage path
    file_size INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_module_files_package ON module_files(package_id);
CREATE INDEX IF NOT EXISTS idx_module_files_type ON module_files(file_type);

-- Add columns to modules table for custom module support
ALTER TABLE modules ADD COLUMN IF NOT EXISTS is_custom BOOLEAN DEFAULT false;
ALTER TABLE modules ADD COLUMN IF NOT EXISTS package_id UUID REFERENCES module_packages(id);
ALTER TABLE modules ADD COLUMN IF NOT EXISTS source_url VARCHAR(500);

-- RLS Policies
ALTER TABLE module_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE module_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage module_packages" ON module_packages
    FOR ALL USING (
        EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.roles IN ('admin', 'superadmin'))
    );

CREATE POLICY "Admins can manage module_files" ON module_files
    FOR ALL USING (
        EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.roles IN ('admin', 'superadmin'))
    );

-- Comments
COMMENT ON TABLE module_packages IS 'Uploaded custom module packages (zip files)';
COMMENT ON TABLE module_files IS 'Individual files extracted from module packages';
