import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Switch,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControlLabel,
  Chip,
  Alert,
  CircularProgress,
  IconButton,
  Tooltip,
  Tabs,
  Tab,
  LinearProgress,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Settings as SettingsIcon,
  CloudUpload as UploadIcon,
  Download as DownloadIcon,
  Inventory as PackageIcon,
} from '@mui/icons-material';
import { AdminLayout } from '@/components/layout/AdminLayout';

// Map module codes to their settings pages
const MODULE_SETTINGS_PATHS: Record<string, string> = {
  monime: '/admin/settings/payment',
  paystack: '/admin/settings/payment',
  stripe: '/admin/settings/payment',
  deposits: '/admin/settings/payment',
  withdrawals: '/admin/settings/payment',
  kyc_advanced: '/admin/settings/kyc',
  loyalty_rewards: '/admin/settings/loyalty',
  bill_payments: '/admin/settings/billing',
};

interface Module {
  id: string;
  code: string;
  name: string;
  description: string;
  category: string;
  version: string;
  is_enabled: boolean;
  is_system: boolean;
  is_custom?: boolean;
  icon: string;
  config: Record<string, any>;
  dependencies: string[];
  created_at: string;
  enabled_at: string | null;
}

interface ModulePackage {
  id: string;
  module_code: string;
  version: string;
  file_size: number;
  status: string;
  created_at: string;
  installed_at?: string;
  manifest: {
    name: string;
    description: string;
    author?: string;
  };
}

const API_BASE = '/api';

export default function ModulesPage() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [packages, setPackages] = useState<ModulePackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [selectedModule, setSelectedModule] = useState<Module | null>(null);
  const [activeTab, setActiveTab] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);

  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
    category: 'feature',
    version: '1.0.0',
    icon: '',
    config: {},
  });

  useEffect(() => {
    loadModules();
    loadPackages();
  }, []);

  const loadPackages = async () => {
    try {
      const response = await fetch(`${API_BASE}/modules/packages`);
      if (response.ok) {
        const data = await response.json();
        setPackages(data.packages || []);
      }
    } catch (err) {
      console.error('Failed to load packages:', err);
    }
  };

  const handleFileUpload = async (file: File) => {
    if (!file) return;

    // Validate file type
    if (!file.name.endsWith('.zip') && !file.name.endsWith('.json')) {
      setError('Please upload a .zip module package or manifest.json file');
      return;
    }

    // Validate file size (50MB max)
    if (file.size > 50 * 1024 * 1024) {
      setError('File too large. Maximum size is 50MB.');
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    setError('');

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${API_BASE}/modules/upload`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setSuccess(`Module "${data.package?.manifest?.name || file.name}" uploaded successfully!`);
        setUploadDialogOpen(false);
        loadModules();
        loadPackages();
      } else {
        setError(data.error || 'Failed to upload module');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to upload module');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleDeletePackage = async (pkg: ModulePackage) => {
    if (!confirm(`Delete package "${pkg.manifest.name}" v${pkg.version}?`)) return;

    try {
      const response = await fetch(`${API_BASE}/modules/packages/${pkg.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setSuccess('Package deleted successfully');
        loadPackages();
        loadModules();
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to delete package');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to delete package');
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const loadModules = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/modules`);

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || `API Error: ${response.status} ${response.statusText}`);
        setLoading(false);
        return;
      }

      const data = await response.json();
      setModules(data.modules || []);
    } catch (err: any) {
      console.error('Failed to load modules:', err);
      setError(err.message || 'Failed to load modules. Check console for details.');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleModule = async (module: Module) => {
    try {
      const response = await fetch(`${API_BASE}/modules/${module.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_enabled: !module.is_enabled }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(`${module.name} ${!module.is_enabled ? 'enabled' : 'disabled'} successfully`);
        loadModules();
      } else {
        setError(data.error || 'Failed to toggle module');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to toggle module');
    }
  };

  const handleCreateModule = async () => {
    try {
      const response = await fetch(`${API_BASE}/modules`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess('Module created successfully');
        setCreateDialogOpen(false);
        resetForm();
        loadModules();
      } else {
        setError(data.error || 'Failed to create module');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create module');
    }
  };

  const handleUpdateModule = async () => {
    if (!selectedModule) return;

    try {
      const response = await fetch(`${API_BASE}/modules/${selectedModule.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess('Module updated successfully');
        setEditDialogOpen(false);
        setSelectedModule(null);
        resetForm();
        loadModules();
      } else {
        setError(data.error || 'Failed to update module');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to update module');
    }
  };

  const handleDeleteModule = async (module: Module) => {
    if (!confirm(`Are you sure you want to delete "${module.name}"?`)) return;

    try {
      const response = await fetch(`${API_BASE}/modules/${module.id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess('Module deleted successfully');
        loadModules();
      } else {
        setError(data.error || 'Failed to delete module');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to delete module');
    }
  };

  const openEditDialog = (module: Module) => {
    setSelectedModule(module);
    setFormData({
      code: module.code,
      name: module.name,
      description: module.description || '',
      category: module.category || 'feature',
      version: module.version || '1.0.0',
      icon: module.icon || '',
      config: module.config || {},
    });
    setEditDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      code: '',
      name: '',
      description: '',
      category: 'feature',
      version: '1.0.0',
      icon: '',
      config: {},
    });
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'feature':
        return 'primary';
      case 'security':
        return 'error';
      case 'payment':
        return 'success';
      default:
        return 'default';
    }
  };

  return (
    <AdminLayout>
      <Box p={3}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">Platform Modules</Typography>
        <Box display="flex" gap={2}>
          <Button
            variant="outlined"
            startIcon={<UploadIcon />}
            onClick={() => setUploadDialogOpen(true)}
          >
            Upload Module
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setCreateDialogOpen(true)}
          >
            Add Custom Module
          </Button>
        </Box>
      </Box>

      <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} sx={{ mb: 3 }}>
        <Tab label="Installed Modules" />
        <Tab label={`Packages (${packages.length})`} />
      </Tabs>

      {error && (
        <Alert severity="error" onClose={() => setError('')} sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {loading && !error ? (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress />
        </Box>
      ) : null}

      {success && (
        <Alert severity="success" onClose={() => setSuccess('')} sx={{ mb: 2 }}>
          {success}
        </Alert>
      )}

      {/* Installed Modules Tab */}
      {activeTab === 0 && !loading && !error && modules.length > 0 && (
        <Box display="flex" flexWrap="wrap" gap={3}>
        {modules.map((module) => (
          <Box flex="1 1 300px" minWidth="300px" maxWidth="400px" key={module.id}>
            <Card elevation={3}>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                  <Box display="flex" alignItems="center" gap={1}>
                    <Typography variant="h4">{module.icon}</Typography>
                    <Box>
                      <Typography variant="h6">{module.name}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        v{module.version}
                      </Typography>
                    </Box>
                  </Box>
                  <Switch
                    checked={module.is_enabled}
                    onChange={() => handleToggleModule(module)}
                    color="primary"
                  />
                </Box>

                <Typography variant="body2" color="text.secondary" mb={2}>
                  {module.description}
                </Typography>

                <Box display="flex" gap={1} mb={2} flexWrap="wrap">
                  <Chip
                    label={module.category}
                    size="small"
                    color={getCategoryColor(module.category)}
                  />
                  {module.is_system && (
                    <Chip label="System" size="small" color="default" />
                  )}
                  {module.is_custom && (
                    <Chip label="Custom" size="small" color="secondary" />
                  )}
                  {module.is_enabled && (
                    <Chip label="Active" size="small" color="success" />
                  )}
                </Box>

                {module.dependencies && module.dependencies.length > 0 && (
                  <Box mb={2}>
                    <Typography variant="caption" color="text.secondary">
                      Dependencies: {module.dependencies.join(', ')}
                    </Typography>
                  </Box>
                )}

                <Box display="flex" justifyContent="flex-end" gap={1}>
                  {/* Configure button for modules with settings */}
                  {MODULE_SETTINGS_PATHS[module.code] && (
                    <Tooltip title="Configure">
                      <IconButton
                        size="small"
                        color="primary"
                        onClick={() => navigate(MODULE_SETTINGS_PATHS[module.code])}
                      >
                        <SettingsIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                  <Tooltip title="Edit Module">
                    <IconButton
                      size="small"
                      onClick={() => openEditDialog(module)}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  {!module.is_system && (
                    <Tooltip title="Delete Module">
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleDeleteModule(module)}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                </Box>
              </CardContent>
            </Card>
          </Box>
        ))}
        </Box>
      )}

      {/* Packages Tab */}
      {activeTab === 1 && (
        <Box>
          {packages.length === 0 ? (
            <Box textAlign="center" py={6}>
              <PackageIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                No module packages uploaded yet
              </Typography>
              <Typography variant="body2" color="text.secondary" mb={3}>
                Upload a module package (.zip) to get started
              </Typography>
              <Button
                variant="contained"
                startIcon={<UploadIcon />}
                onClick={() => setUploadDialogOpen(true)}
              >
                Upload Module Package
              </Button>
            </Box>
          ) : (
            <Box display="flex" flexDirection="column" gap={2}>
              {packages.map((pkg) => (
                <Card key={pkg.id} elevation={2}>
                  <CardContent>
                    <Box display="flex" justifyContent="space-between" alignItems="center">
                      <Box>
                        <Typography variant="h6">{pkg.manifest.name}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          {pkg.module_code} v{pkg.version} • {formatFileSize(pkg.file_size)}
                        </Typography>
                        {pkg.manifest.author && (
                          <Typography variant="caption" color="text.secondary">
                            by {pkg.manifest.author}
                          </Typography>
                        )}
                      </Box>
                      <Box display="flex" alignItems="center" gap={2}>
                        <Chip
                          label={pkg.status}
                          size="small"
                          color={pkg.status === 'installed' ? 'success' : pkg.status === 'failed' ? 'error' : 'default'}
                        />
                        <Typography variant="caption" color="text.secondary">
                          {new Date(pkg.created_at).toLocaleDateString()}
                        </Typography>
                        <Tooltip title="Delete Package">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleDeletePackage(pkg)}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              ))}
            </Box>
          )}
        </Box>
      )}

      {/* Upload Module Dialog */}
      <Dialog open={uploadDialogOpen} onClose={() => !uploading && setUploadDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Upload Module Package</DialogTitle>
        <DialogContent>
          <Box mt={2}>
            <Box
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              sx={{
                border: '2px dashed',
                borderColor: dragActive ? 'primary.main' : 'divider',
                borderRadius: 2,
                p: 4,
                textAlign: 'center',
                bgcolor: dragActive ? 'action.hover' : 'background.paper',
                cursor: 'pointer',
                transition: 'all 0.2s',
                '&:hover': {
                  borderColor: 'primary.main',
                  bgcolor: 'action.hover',
                },
              }}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                type="file"
                ref={fileInputRef}
                hidden
                accept=".zip,.json"
                onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
              />
              <UploadIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                {dragActive ? 'Drop file here' : 'Drag & drop or click to upload'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Supported formats: .zip (module package) or .json (manifest only)
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block" mt={1}>
                Maximum file size: 50MB
              </Typography>
            </Box>

            {uploading && (
              <Box mt={3}>
                <LinearProgress variant="indeterminate" />
                <Typography variant="body2" color="text.secondary" mt={1} textAlign="center">
                  Uploading and installing module...
                </Typography>
              </Box>
            )}

            <Alert severity="info" sx={{ mt: 3 }}>
              <Typography variant="body2">
                <strong>Module Package Structure:</strong>
              </Typography>
              <Typography variant="caption" component="div" sx={{ mt: 1, fontFamily: 'monospace' }}>
                my-module.zip/<br />
                ├── manifest.json (required)<br />
                ├── service.ts<br />
                ├── routes.ts<br />
                └── components/
              </Typography>
            </Alert>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUploadDialogOpen(false)} disabled={uploading}>
            Cancel
          </Button>
        </DialogActions>
      </Dialog>

      {/* Create Module Dialog */}
      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create Custom Module</DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={2} mt={1}>
            <TextField
              label="Module Code"
              placeholder="e.g., custom_feature"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value })}
              fullWidth
              required
            />
            <TextField
              label="Module Name"
              placeholder="e.g., Custom Feature"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              fullWidth
              required
            />
            <TextField
              label="Description"
              placeholder="Describe what this module does"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              multiline
              rows={3}
              fullWidth
            />
            <TextField
              label="Category"
              select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              SelectProps={{ native: true }}
              fullWidth
            >
              <option value="feature">Feature</option>
              <option value="security">Security</option>
              <option value="payment">Payment</option>
              <option value="integration">Integration</option>
            </TextField>
            <TextField
              label="Icon (Emoji)"
              placeholder="e.g., 🎯"
              value={formData.icon}
              onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
              fullWidth
            />
            <TextField
              label="Version"
              value={formData.version}
              onChange={(e) => setFormData({ ...formData, version: e.target.value })}
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleCreateModule} variant="contained">
            Create Module
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Module Dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Module</DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={2} mt={1}>
            <TextField
              label="Module Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              fullWidth
            />
            <TextField
              label="Description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              multiline
              rows={3}
              fullWidth
            />
            <TextField
              label="Icon (Emoji)"
              value={formData.icon}
              onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleUpdateModule} variant="contained">
            Update Module
          </Button>
        </DialogActions>
      </Dialog>
      </Box>
    </AdminLayout>
  );
}
