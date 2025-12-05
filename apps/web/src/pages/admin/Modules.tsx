import React, { useState, useEffect } from 'react';
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
  Grid,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Settings as SettingsIcon,
} from '@mui/icons-material';
import { AdminLayout } from '@/components/layout/AdminLayout';

interface Module {
  id: string;
  code: string;
  name: string;
  description: string;
  category: string;
  version: string;
  is_enabled: boolean;
  is_system: boolean;
  icon: string;
  config: Record<string, any>;
  dependencies: string[];
  created_at: string;
  enabled_at: string | null;
}

const API_BASE = '/api';

export default function ModulesPage() {
  const [modules, setModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedModule, setSelectedModule] = useState<Module | null>(null);

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
  }, []);

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
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setCreateDialogOpen(true)}
        >
          Add Custom Module
        </Button>
      </Box>

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

      {!loading && !error && modules.length > 0 && (
        <Grid container spacing={3}>
        {modules.map((module) => (
          <Grid item xs={12} md={6} lg={4} key={module.id}>
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
          </Grid>
        ))}
        </Grid>
      )}

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
