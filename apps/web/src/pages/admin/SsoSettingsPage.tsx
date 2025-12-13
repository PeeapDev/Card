import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Switch,
  Button,
  TextField,
  Alert,
  CircularProgress,
  Divider,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tooltip,
  Tabs,
  Tab,
} from '@mui/material';
import {
  Save as SaveIcon,
  Refresh as RefreshIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  ContentCopy as CopyIcon,
  Visibility as ViewIcon,
  VisibilityOff as HideIcon,
} from '@mui/icons-material';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { supabase } from '@/lib/supabase';

interface SsoSettings {
  internal_sso: {
    enabled: boolean;
    apps: Record<string, { enabled: boolean; domain: string; dev_port: number }>;
    token_expiry_minutes: number;
    session_expiry_days: number;
  };
  external_sso: {
    enabled: boolean;
    require_approval: boolean;
    allowed_scopes: string[];
    dangerous_scopes: string[];
    token_expiry: {
      authorization_code_minutes: number;
      access_token_hours: number;
      refresh_token_days: number;
    };
  };
  shared_api: {
    enabled: boolean;
    endpoints: Record<string, boolean>;
    rate_limits: { per_minute: number; per_hour: number };
    transfer_settings: {
      require_pin: boolean;
      max_amount: number;
      daily_limit: number;
    };
  };
}

interface OAuthClient {
  id: string;
  client_id: string;
  client_secret: string;
  name: string;
  description?: string;
  website_url?: string;
  redirect_uris: string[];
  scopes: string[];
  is_active: boolean;
  created_at: string;
}

const DEFAULT_SETTINGS: SsoSettings = {
  internal_sso: {
    enabled: true,
    apps: {
      my: { enabled: true, domain: 'my.peeap.com', dev_port: 5173 },
      plus: { enabled: true, domain: 'plus.peeap.com', dev_port: 3000 },
      checkout: { enabled: true, domain: 'checkout.peeap.com', dev_port: 5174 },
      developer: { enabled: false, domain: 'developer.peeap.com', dev_port: 5175 },
    },
    token_expiry_minutes: 5,
    session_expiry_days: 7,
  },
  external_sso: {
    enabled: false,
    require_approval: true,
    allowed_scopes: ['profile', 'email', 'wallet:read', 'transactions:read'],
    dangerous_scopes: ['wallet:write', 'transfers:write'],
    token_expiry: {
      authorization_code_minutes: 10,
      access_token_hours: 1,
      refresh_token_days: 30,
    },
  },
  shared_api: {
    enabled: true,
    endpoints: {
      user: true,
      contacts: true,
      wallet: true,
      transactions: true,
      transfer: true,
      checkout: true,
    },
    rate_limits: { per_minute: 60, per_hour: 1000 },
    transfer_settings: {
      require_pin: false,
      max_amount: 1000000,
      daily_limit: 5000000,
    },
  },
};

export default function SsoSettingsPage() {
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [settings, setSettings] = useState<SsoSettings>(DEFAULT_SETTINGS);
  const [oauthClients, setOauthClients] = useState<OAuthClient[]>([]);
  const [newClientDialog, setNewClientDialog] = useState(false);
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const [newClient, setNewClient] = useState({
    name: '',
    description: '',
    website_url: '',
    redirect_uris: '',
    scopes: ['profile', 'email'],
  });

  useEffect(() => {
    loadSettings();
    loadOAuthClients();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('sso_settings')
        .select('setting_key, setting_value');

      if (error) throw error;

      const loadedSettings = { ...DEFAULT_SETTINGS };
      data?.forEach((row) => {
        if (row.setting_key in loadedSettings) {
          (loadedSettings as any)[row.setting_key] = row.setting_value;
        }
      });

      setSettings(loadedSettings);
    } catch (err: any) {
      console.error('Failed to load SSO settings:', err);
      setError('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const loadOAuthClients = async () => {
    try {
      const { data, error } = await supabase
        .from('oauth_clients')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOauthClients(data || []);
    } catch (err: any) {
      console.error('Failed to load OAuth clients:', err);
    }
  };

  const saveSettings = async () => {
    try {
      setSaving(true);
      setError('');

      for (const [key, value] of Object.entries(settings)) {
        const { error } = await supabase
          .from('sso_settings')
          .upsert({
            setting_key: key,
            setting_value: value,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'setting_key' });

        if (error) throw error;
      }

      setSuccess('Settings saved successfully');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const generateClientCredentials = () => {
    const clientId = `peeap_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;
    const clientSecret = Array.from(crypto.getRandomValues(new Uint8Array(32)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    return { clientId, clientSecret };
  };

  const createOAuthClient = async () => {
    try {
      const { clientId, clientSecret } = generateClientCredentials();
      const redirectUris = newClient.redirect_uris
        .split('\n')
        .map(u => u.trim())
        .filter(u => u);

      const { error } = await supabase.from('oauth_clients').insert({
        client_id: clientId,
        client_secret: clientSecret,
        name: newClient.name,
        description: newClient.description || null,
        website_url: newClient.website_url || null,
        redirect_uris: redirectUris,
        scopes: newClient.scopes,
        is_active: true,
      });

      if (error) throw error;

      setSuccess('OAuth client created successfully');
      setNewClientDialog(false);
      setNewClient({
        name: '',
        description: '',
        website_url: '',
        redirect_uris: '',
        scopes: ['profile', 'email'],
      });
      loadOAuthClients();
    } catch (err: any) {
      setError(err.message || 'Failed to create OAuth client');
    }
  };

  const toggleClientStatus = async (client: OAuthClient) => {
    try {
      const { error } = await supabase
        .from('oauth_clients')
        .update({ is_active: !client.is_active })
        .eq('id', client.id);

      if (error) throw error;
      loadOAuthClients();
    } catch (err: any) {
      setError(err.message || 'Failed to update client');
    }
  };

  const deleteClient = async (client: OAuthClient) => {
    if (!confirm(`Delete OAuth client "${client.name}"? This will revoke all access tokens.`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('oauth_clients')
        .delete()
        .eq('id', client.id);

      if (error) throw error;
      setSuccess('OAuth client deleted');
      loadOAuthClients();
    } catch (err: any) {
      setError(err.message || 'Failed to delete client');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setSuccess('Copied to clipboard');
    setTimeout(() => setSuccess(''), 2000);
  };

  if (loading) {
    return (
      <AdminLayout>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress />
        </Box>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <Box p={3}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h4">SSO Settings</Typography>
          <Box display="flex" gap={2}>
            <Button
              startIcon={<RefreshIcon />}
              onClick={() => { loadSettings(); loadOAuthClients(); }}
            >
              Refresh
            </Button>
            <Button
              variant="contained"
              startIcon={<SaveIcon />}
              onClick={saveSettings}
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save Settings'}
            </Button>
          </Box>
        </Box>

        {error && (
          <Alert severity="error" onClose={() => setError('')} sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" onClose={() => setSuccess('')} sx={{ mb: 2 }}>
            {success}
          </Alert>
        )}

        <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} sx={{ mb: 3 }}>
          <Tab label="Internal SSO" />
          <Tab label="External SSO (OAuth)" />
          <Tab label="Shared API" />
          <Tab label="OAuth Clients" />
        </Tabs>

        {/* Internal SSO Tab */}
        {activeTab === 0 && (
          <Card>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Box>
                  <Typography variant="h6">Internal SSO</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Single Sign-On between Peeap domains
                  </Typography>
                </Box>
                <Switch
                  checked={settings.internal_sso.enabled}
                  onChange={(e) => setSettings({
                    ...settings,
                    internal_sso: { ...settings.internal_sso, enabled: e.target.checked }
                  })}
                />
              </Box>

              <Divider sx={{ my: 2 }} />

              <Typography variant="subtitle1" gutterBottom>Enabled Apps</Typography>
              <Box display="flex" flexWrap="wrap" gap={2} mb={3}>
                {Object.entries(settings.internal_sso.apps).map(([key, app]) => (
                  <Card key={key} variant="outlined" sx={{ p: 2, minWidth: 200 }}>
                    <Box display="flex" justifyContent="space-between" alignItems="center">
                      <Box>
                        <Typography variant="subtitle2" textTransform="capitalize">
                          {key}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {app.domain}
                        </Typography>
                      </Box>
                      <Switch
                        checked={app.enabled}
                        onChange={(e) => setSettings({
                          ...settings,
                          internal_sso: {
                            ...settings.internal_sso,
                            apps: {
                              ...settings.internal_sso.apps,
                              [key]: { ...app, enabled: e.target.checked }
                            }
                          }
                        })}
                      />
                    </Box>
                  </Card>
                ))}
              </Box>

              <Typography variant="subtitle1" gutterBottom>Token Settings</Typography>
              <Box display="flex" gap={3}>
                <TextField
                  label="Token Expiry (minutes)"
                  type="number"
                  value={settings.internal_sso.token_expiry_minutes}
                  onChange={(e) => setSettings({
                    ...settings,
                    internal_sso: {
                      ...settings.internal_sso,
                      token_expiry_minutes: parseInt(e.target.value) || 5
                    }
                  })}
                  sx={{ width: 200 }}
                />
                <TextField
                  label="Session Expiry (days)"
                  type="number"
                  value={settings.internal_sso.session_expiry_days}
                  onChange={(e) => setSettings({
                    ...settings,
                    internal_sso: {
                      ...settings.internal_sso,
                      session_expiry_days: parseInt(e.target.value) || 7
                    }
                  })}
                  sx={{ width: 200 }}
                />
              </Box>
            </CardContent>
          </Card>
        )}

        {/* External SSO Tab */}
        {activeTab === 1 && (
          <Card>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Box>
                  <Typography variant="h6">External SSO (OAuth 2.0)</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Allow third-party websites to use "Login with Peeap"
                  </Typography>
                </Box>
                <Switch
                  checked={settings.external_sso.enabled}
                  onChange={(e) => setSettings({
                    ...settings,
                    external_sso: { ...settings.external_sso, enabled: e.target.checked }
                  })}
                />
              </Box>

              {!settings.external_sso.enabled && (
                <Alert severity="warning" sx={{ mb: 2 }}>
                  External SSO is currently disabled. Third-party applications cannot authenticate users.
                </Alert>
              )}

              <Divider sx={{ my: 2 }} />

              <Typography variant="subtitle1" gutterBottom>Allowed Scopes</Typography>
              <Box display="flex" flexWrap="wrap" gap={1} mb={3}>
                {['profile', 'email', 'phone', 'wallet:read', 'wallet:write', 'transactions:read', 'transfers:write'].map((scope) => (
                  <Chip
                    key={scope}
                    label={scope}
                    color={settings.external_sso.allowed_scopes.includes(scope) ? 'primary' : 'default'}
                    variant={settings.external_sso.dangerous_scopes.includes(scope) ? 'outlined' : 'filled'}
                    onClick={() => {
                      const scopes = settings.external_sso.allowed_scopes.includes(scope)
                        ? settings.external_sso.allowed_scopes.filter(s => s !== scope)
                        : [...settings.external_sso.allowed_scopes, scope];
                      setSettings({
                        ...settings,
                        external_sso: { ...settings.external_sso, allowed_scopes: scopes }
                      });
                    }}
                  />
                ))}
              </Box>

              <Typography variant="subtitle1" gutterBottom>Token Expiry Settings</Typography>
              <Box display="flex" gap={3} flexWrap="wrap">
                <TextField
                  label="Auth Code Expiry (minutes)"
                  type="number"
                  value={settings.external_sso.token_expiry.authorization_code_minutes}
                  onChange={(e) => setSettings({
                    ...settings,
                    external_sso: {
                      ...settings.external_sso,
                      token_expiry: {
                        ...settings.external_sso.token_expiry,
                        authorization_code_minutes: parseInt(e.target.value) || 10
                      }
                    }
                  })}
                  sx={{ width: 200 }}
                />
                <TextField
                  label="Access Token Expiry (hours)"
                  type="number"
                  value={settings.external_sso.token_expiry.access_token_hours}
                  onChange={(e) => setSettings({
                    ...settings,
                    external_sso: {
                      ...settings.external_sso,
                      token_expiry: {
                        ...settings.external_sso.token_expiry,
                        access_token_hours: parseInt(e.target.value) || 1
                      }
                    }
                  })}
                  sx={{ width: 200 }}
                />
                <TextField
                  label="Refresh Token Expiry (days)"
                  type="number"
                  value={settings.external_sso.token_expiry.refresh_token_days}
                  onChange={(e) => setSettings({
                    ...settings,
                    external_sso: {
                      ...settings.external_sso,
                      token_expiry: {
                        ...settings.external_sso.token_expiry,
                        refresh_token_days: parseInt(e.target.value) || 30
                      }
                    }
                  })}
                  sx={{ width: 200 }}
                />
              </Box>
            </CardContent>
          </Card>
        )}

        {/* Shared API Tab */}
        {activeTab === 2 && (
          <Card>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Box>
                  <Typography variant="h6">Shared API</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Cross-domain API access for contacts, wallet, and transfers
                  </Typography>
                </Box>
                <Switch
                  checked={settings.shared_api.enabled}
                  onChange={(e) => setSettings({
                    ...settings,
                    shared_api: { ...settings.shared_api, enabled: e.target.checked }
                  })}
                />
              </Box>

              <Divider sx={{ my: 2 }} />

              <Typography variant="subtitle1" gutterBottom>Enabled Endpoints</Typography>
              <Box display="flex" flexWrap="wrap" gap={2} mb={3}>
                {Object.entries(settings.shared_api.endpoints).map(([endpoint, enabled]) => (
                  <Card key={endpoint} variant="outlined" sx={{ p: 2 }}>
                    <Box display="flex" alignItems="center" gap={2}>
                      <Typography variant="body2">/api/shared/{endpoint}</Typography>
                      <Switch
                        size="small"
                        checked={enabled}
                        onChange={(e) => setSettings({
                          ...settings,
                          shared_api: {
                            ...settings.shared_api,
                            endpoints: {
                              ...settings.shared_api.endpoints,
                              [endpoint]: e.target.checked
                            }
                          }
                        })}
                      />
                    </Box>
                  </Card>
                ))}
              </Box>

              <Typography variant="subtitle1" gutterBottom>Rate Limits</Typography>
              <Box display="flex" gap={3} mb={3}>
                <TextField
                  label="Requests per minute"
                  type="number"
                  value={settings.shared_api.rate_limits.per_minute}
                  onChange={(e) => setSettings({
                    ...settings,
                    shared_api: {
                      ...settings.shared_api,
                      rate_limits: {
                        ...settings.shared_api.rate_limits,
                        per_minute: parseInt(e.target.value) || 60
                      }
                    }
                  })}
                  sx={{ width: 200 }}
                />
                <TextField
                  label="Requests per hour"
                  type="number"
                  value={settings.shared_api.rate_limits.per_hour}
                  onChange={(e) => setSettings({
                    ...settings,
                    shared_api: {
                      ...settings.shared_api,
                      rate_limits: {
                        ...settings.shared_api.rate_limits,
                        per_hour: parseInt(e.target.value) || 1000
                      }
                    }
                  })}
                  sx={{ width: 200 }}
                />
              </Box>

              <Typography variant="subtitle1" gutterBottom>Transfer Settings</Typography>
              <Box display="flex" gap={3} alignItems="center">
                <TextField
                  label="Max Amount per Transfer"
                  type="number"
                  value={settings.shared_api.transfer_settings.max_amount}
                  onChange={(e) => setSettings({
                    ...settings,
                    shared_api: {
                      ...settings.shared_api,
                      transfer_settings: {
                        ...settings.shared_api.transfer_settings,
                        max_amount: parseInt(e.target.value) || 1000000
                      }
                    }
                  })}
                  sx={{ width: 200 }}
                />
                <Box display="flex" alignItems="center" gap={1}>
                  <Typography variant="body2">Require PIN</Typography>
                  <Switch
                    checked={settings.shared_api.transfer_settings.require_pin}
                    onChange={(e) => setSettings({
                      ...settings,
                      shared_api: {
                        ...settings.shared_api,
                        transfer_settings: {
                          ...settings.shared_api.transfer_settings,
                          require_pin: e.target.checked
                        }
                      }
                    })}
                  />
                </Box>
              </Box>
            </CardContent>
          </Card>
        )}

        {/* OAuth Clients Tab */}
        {activeTab === 3 && (
          <Card>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h6">Registered OAuth Clients</Typography>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => setNewClientDialog(true)}
                >
                  Add Client
                </Button>
              </Box>

              {oauthClients.length === 0 ? (
                <Alert severity="info">
                  No OAuth clients registered yet. Create one to allow third-party integrations.
                </Alert>
              ) : (
                <TableContainer component={Paper} variant="outlined">
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Name</TableCell>
                        <TableCell>Client ID</TableCell>
                        <TableCell>Scopes</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Created</TableCell>
                        <TableCell align="right">Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {oauthClients.map((client) => (
                        <TableRow key={client.id}>
                          <TableCell>
                            <Typography variant="subtitle2">{client.name}</Typography>
                            {client.website_url && (
                              <Typography variant="caption" color="text.secondary">
                                {client.website_url}
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell>
                            <Box display="flex" alignItems="center" gap={1}>
                              <Typography variant="body2" fontFamily="monospace" fontSize={12}>
                                {client.client_id.substring(0, 20)}...
                              </Typography>
                              <Tooltip title="Copy Client ID">
                                <IconButton size="small" onClick={() => copyToClipboard(client.client_id)}>
                                  <CopyIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title={showSecrets[client.id] ? 'Hide Secret' : 'Show Secret'}>
                                <IconButton
                                  size="small"
                                  onClick={() => setShowSecrets({
                                    ...showSecrets,
                                    [client.id]: !showSecrets[client.id]
                                  })}
                                >
                                  {showSecrets[client.id] ? <HideIcon fontSize="small" /> : <ViewIcon fontSize="small" />}
                                </IconButton>
                              </Tooltip>
                            </Box>
                            {showSecrets[client.id] && (
                              <Box display="flex" alignItems="center" gap={1} mt={1}>
                                <Typography variant="caption" fontFamily="monospace" color="error">
                                  Secret: {client.client_secret.substring(0, 16)}...
                                </Typography>
                                <IconButton size="small" onClick={() => copyToClipboard(client.client_secret)}>
                                  <CopyIcon fontSize="small" />
                                </IconButton>
                              </Box>
                            )}
                          </TableCell>
                          <TableCell>
                            <Box display="flex" flexWrap="wrap" gap={0.5}>
                              {client.scopes.slice(0, 3).map((scope) => (
                                <Chip key={scope} label={scope} size="small" />
                              ))}
                              {client.scopes.length > 3 && (
                                <Chip label={`+${client.scopes.length - 3}`} size="small" variant="outlined" />
                              )}
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={client.is_active ? 'Active' : 'Disabled'}
                              color={client.is_active ? 'success' : 'default'}
                              size="small"
                            />
                          </TableCell>
                          <TableCell>
                            {new Date(client.created_at).toLocaleDateString()}
                          </TableCell>
                          <TableCell align="right">
                            <Switch
                              size="small"
                              checked={client.is_active}
                              onChange={() => toggleClientStatus(client)}
                            />
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => deleteClient(client)}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </CardContent>
          </Card>
        )}

        {/* New Client Dialog */}
        <Dialog open={newClientDialog} onClose={() => setNewClientDialog(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Create OAuth Client</DialogTitle>
          <DialogContent>
            <Box display="flex" flexDirection="column" gap={2} mt={2}>
              <TextField
                label="Application Name"
                fullWidth
                value={newClient.name}
                onChange={(e) => setNewClient({ ...newClient, name: e.target.value })}
                required
              />
              <TextField
                label="Description"
                fullWidth
                multiline
                rows={2}
                value={newClient.description}
                onChange={(e) => setNewClient({ ...newClient, description: e.target.value })}
              />
              <TextField
                label="Website URL"
                fullWidth
                value={newClient.website_url}
                onChange={(e) => setNewClient({ ...newClient, website_url: e.target.value })}
                placeholder="https://example.com"
              />
              <TextField
                label="Redirect URIs (one per line)"
                fullWidth
                multiline
                rows={3}
                value={newClient.redirect_uris}
                onChange={(e) => setNewClient({ ...newClient, redirect_uris: e.target.value })}
                placeholder="https://example.com/callback&#10;https://example.com/auth/callback"
                required
              />
              <Box>
                <Typography variant="subtitle2" gutterBottom>Scopes</Typography>
                <Box display="flex" flexWrap="wrap" gap={1}>
                  {['profile', 'email', 'phone', 'wallet:read', 'transactions:read'].map((scope) => (
                    <Chip
                      key={scope}
                      label={scope}
                      color={newClient.scopes.includes(scope) ? 'primary' : 'default'}
                      onClick={() => {
                        const scopes = newClient.scopes.includes(scope)
                          ? newClient.scopes.filter(s => s !== scope)
                          : [...newClient.scopes, scope];
                        setNewClient({ ...newClient, scopes });
                      }}
                    />
                  ))}
                </Box>
              </Box>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setNewClientDialog(false)}>Cancel</Button>
            <Button
              variant="contained"
              onClick={createOAuthClient}
              disabled={!newClient.name || !newClient.redirect_uris}
            >
              Create Client
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </AdminLayout>
  );
}
