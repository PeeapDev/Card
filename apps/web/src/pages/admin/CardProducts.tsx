import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Chip,
  Alert,
  CircularProgress,
  Switch,
  FormControlLabel,
  Tabs,
  Tab,
  Divider,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
} from '@mui/icons-material';
import { AdminLayout } from '@/components/layout/AdminLayout';

interface CardProduct {
  id: string;
  code: string;
  name: string;
  description: string;
  tier: number;
  purchase_price: number;
  annual_fee: number;
  currency: string;
  daily_transaction_limit: number;
  monthly_transaction_limit: number;
  max_balance: number;
  transaction_fee_percent: number;
  transaction_fee_flat: number;
  bin_prefix: string;
  card_length: number;
  is_online_enabled: boolean;
  is_atm_enabled: boolean;
  is_contactless_enabled: boolean;
  is_international_enabled: boolean;
  cashback_percent: number;
  features: string[];
  card_design_url?: string;
  card_color: string;
  card_text_color: string;
  is_active: boolean;
  is_visible: boolean;
  stock_limit?: number;
  cards_issued: number;
  sort_order: number;
}

const API_BASE = '/api';

const defaultFormData = {
  code: '',
  name: '',
  description: '',
  tier: 1,
  purchase_price: 0,
  annual_fee: 0,
  currency: 'SLE',
  daily_transaction_limit: 50000,
  monthly_transaction_limit: 500000,
  max_balance: 1000000,
  transaction_fee_percent: 1.5,
  transaction_fee_flat: 0,
  bin_prefix: '520010',
  card_length: 16,
  is_online_enabled: true,
  is_atm_enabled: false,
  is_contactless_enabled: false,
  is_international_enabled: false,
  cashback_percent: 0,
  features: [] as string[],
  card_design_url: '',
  card_color: '#1A1A1A',
  card_text_color: '#FFFFFF',
  is_active: true,
  is_visible: true,
  stock_limit: undefined as number | undefined,
  sort_order: 0,
};

export default function CardProductsPage() {
  const [products, setProducts] = useState<CardProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<CardProduct | null>(null);
  const [currentTab, setCurrentTab] = useState(0);

  const [formData, setFormData] = useState(defaultFormData);
  const [featureInput, setFeatureInput] = useState('');

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/card-products?admin=true`);
      const data = await response.json();

      if (response.ok) {
        setProducts(data.products || []);
      } else {
        setError(data.error || 'Failed to load card products');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load card products');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProduct = async () => {
    try {
      const response = await fetch(`${API_BASE}/card-products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess('Card product created successfully');
        setDialogOpen(false);
        resetForm();
        loadProducts();
      } else {
        setError(data.error || 'Failed to create card product');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create card product');
    }
  };

  const handleUpdateProduct = async () => {
    if (!selectedProduct) return;

    try {
      const response = await fetch(`${API_BASE}/card-products/${selectedProduct.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess('Card product updated successfully');
        setDialogOpen(false);
        setSelectedProduct(null);
        setEditMode(false);
        resetForm();
        loadProducts();
      } else {
        setError(data.error || 'Failed to update card product');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to update card product');
    }
  };

  const handleDeleteProduct = async (product: CardProduct) => {
    if (!confirm(`Are you sure you want to delete "${product.name}"?`)) return;

    try {
      const response = await fetch(`${API_BASE}/card-products/${product.id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess('Card product deleted successfully');
        loadProducts();
      } else {
        setError(data.error || 'Failed to delete card product');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to delete card product');
    }
  };

  const openCreateDialog = () => {
    resetForm();
    setEditMode(false);
    setDialogOpen(true);
  };

  const openEditDialog = (product: CardProduct) => {
    setSelectedProduct(product);
    setFormData({
      code: product.code,
      name: product.name,
      description: product.description || '',
      tier: product.tier,
      purchase_price: product.purchase_price,
      annual_fee: product.annual_fee,
      currency: product.currency,
      daily_transaction_limit: product.daily_transaction_limit,
      monthly_transaction_limit: product.monthly_transaction_limit,
      max_balance: product.max_balance,
      transaction_fee_percent: product.transaction_fee_percent,
      transaction_fee_flat: product.transaction_fee_flat,
      bin_prefix: product.bin_prefix,
      card_length: product.card_length,
      is_online_enabled: product.is_online_enabled,
      is_atm_enabled: product.is_atm_enabled,
      is_contactless_enabled: product.is_contactless_enabled,
      is_international_enabled: product.is_international_enabled,
      cashback_percent: product.cashback_percent,
      features: product.features || [],
      card_design_url: product.card_design_url || '',
      card_color: product.card_color,
      card_text_color: product.card_text_color,
      is_active: product.is_active,
      is_visible: product.is_visible,
      stock_limit: product.stock_limit,
      sort_order: product.sort_order,
    });
    setEditMode(true);
    setDialogOpen(true);
  };

  const resetForm = () => {
    setFormData(defaultFormData);
    setFeatureInput('');
  };

  const addFeature = () => {
    if (featureInput.trim()) {
      setFormData({
        ...formData,
        features: [...formData.features, featureInput.trim()],
      });
      setFeatureInput('');
    }
  };

  const removeFeature = (index: number) => {
    setFormData({
      ...formData,
      features: formData.features.filter((_, i) => i !== index),
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-SL', {
      style: 'currency',
      currency: 'SLE',
      minimumFractionDigits: 0,
    }).format(amount);
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
        <Typography variant="h4">Card Products</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openCreateDialog}>
          Create Card Product
        </Button>
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

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Tier</TableCell>
              <TableCell>Name</TableCell>
              <TableCell>Price</TableCell>
              <TableCell>Daily Limit</TableCell>
              <TableCell>Features</TableCell>
              <TableCell>Cards Issued</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {products.map((product) => (
              <TableRow key={product.id}>
                <TableCell>
                  <Chip label={`Tier ${product.tier}`} size="small" color="primary" />
                </TableCell>
                <TableCell>
                  <Typography variant="body2" fontWeight="bold">
                    {product.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {product.code}
                  </Typography>
                </TableCell>
                <TableCell>{formatCurrency(product.purchase_price)}</TableCell>
                <TableCell>{formatCurrency(product.daily_transaction_limit)}</TableCell>
                <TableCell>
                  <Box display="flex" gap={0.5} flexWrap="wrap">
                    {product.is_online_enabled && (
                      <Chip label="Online" size="small" />
                    )}
                    {product.is_atm_enabled && <Chip label="ATM" size="small" />}
                    {product.is_international_enabled && (
                      <Chip label="International" size="small" />
                    )}
                  </Box>
                </TableCell>
                <TableCell>
                  <Typography variant="body2">{product.cards_issued}</Typography>
                  {product.stock_limit && (
                    <Typography variant="caption" color="text.secondary">
                      / {product.stock_limit}
                    </Typography>
                  )}
                </TableCell>
                <TableCell>
                  <Box display="flex" gap={0.5} flexDirection="column">
                    {product.is_active ? (
                      <Chip label="Active" size="small" color="success" />
                    ) : (
                      <Chip label="Inactive" size="small" color="default" />
                    )}
                    {product.is_visible ? (
                      <Chip label="Visible" size="small" color="info" />
                    ) : (
                      <Chip label="Hidden" size="small" color="default" />
                    )}
                  </Box>
                </TableCell>
                <TableCell align="right">
                  <IconButton size="small" onClick={() => openEditDialog(product)}>
                    <EditIcon fontSize="small" />
                  </IconButton>
                  <IconButton
                    size="small"
                    color="error"
                    onClick={() => handleDeleteProduct(product)}
                    disabled={product.cards_issued > 0}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>{editMode ? 'Edit Card Product' : 'Create Card Product'}</DialogTitle>
        <DialogContent>
          <Tabs value={currentTab} onChange={(_, v) => setCurrentTab(v)} sx={{ mb: 2 }}>
            <Tab label="Basic Info" />
            <Tab label="Pricing & Limits" />
            <Tab label="Features" />
            <Tab label="Design" />
          </Tabs>

          {/* Basic Info Tab */}
          {currentTab === 0 && (
            <Box display="flex" flexDirection="column" gap={2}>
              <TextField
                label="Product Code"
                placeholder="e.g., gold"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                fullWidth
                required
                disabled={editMode}
              />
              <TextField
                label="Product Name"
                placeholder="e.g., Gold Card"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                fullWidth
                required
              />
              <TextField
                label="Description"
                placeholder="Describe the card benefits"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                multiline
                rows={3}
                fullWidth
              />
              <Box display="flex" gap={2}>
                <Box flex={1}>
                  <TextField
                    label="Tier"
                    type="number"
                    value={formData.tier}
                    onChange={(e) =>
                      setFormData({ ...formData, tier: parseInt(e.target.value) })
                    }
                    fullWidth
                    required
                  />
                </Box>
                <Box flex={1}>
                  <TextField
                    label="Sort Order"
                    type="number"
                    value={formData.sort_order}
                    onChange={(e) =>
                      setFormData({ ...formData, sort_order: parseInt(e.target.value) })
                    }
                    fullWidth
                  />
                </Box>
              </Box>
            </Box>
          )}

          {/* Pricing & Limits Tab */}
          {currentTab === 1 && (
            <Box display="flex" flexDirection="column" gap={2}>
              <Box display="flex" gap={2}>
                <Box flex={1}>
                  <TextField
                    label="Purchase Price"
                    type="number"
                    value={formData.purchase_price}
                    onChange={(e) =>
                      setFormData({ ...formData, purchase_price: parseFloat(e.target.value) })
                    }
                    fullWidth
                    required
                  />
                </Box>
                <Box flex={1}>
                  <TextField
                    label="Annual Fee"
                    type="number"
                    value={formData.annual_fee}
                    onChange={(e) =>
                      setFormData({ ...formData, annual_fee: parseFloat(e.target.value) })
                    }
                    fullWidth
                  />
                </Box>
              </Box>

              <Divider />

              <TextField
                label="Daily Transaction Limit"
                type="number"
                value={formData.daily_transaction_limit}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    daily_transaction_limit: parseFloat(e.target.value),
                  })
                }
                fullWidth
              />
              <TextField
                label="Monthly Transaction Limit"
                type="number"
                value={formData.monthly_transaction_limit}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    monthly_transaction_limit: parseFloat(e.target.value),
                  })
                }
                fullWidth
              />
              <TextField
                label="Max Balance"
                type="number"
                value={formData.max_balance}
                onChange={(e) =>
                  setFormData({ ...formData, max_balance: parseFloat(e.target.value) })
                }
                fullWidth
              />

              <Divider />

              <Box display="flex" gap={2}>
                <Box flex={1}>
                  <TextField
                    label="Transaction Fee (%)"
                    type="number"
                    value={formData.transaction_fee_percent}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        transaction_fee_percent: parseFloat(e.target.value),
                      })
                    }
                    fullWidth
                  />
                </Box>
                <Box flex={1}>
                  <TextField
                    label="Transaction Fee (Flat)"
                    type="number"
                    value={formData.transaction_fee_flat}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        transaction_fee_flat: parseFloat(e.target.value),
                      })
                    }
                    fullWidth
                  />
                </Box>
              </Box>

              <TextField
                label="Cashback Percent"
                type="number"
                value={formData.cashback_percent}
                onChange={(e) =>
                  setFormData({ ...formData, cashback_percent: parseFloat(e.target.value) })
                }
                fullWidth
              />

              <Divider />

              <Box display="flex" gap={2}>
                <Box flex={1}>
                  <TextField
                    label="BIN Prefix"
                    placeholder="e.g., 520013"
                    value={formData.bin_prefix}
                    onChange={(e) => setFormData({ ...formData, bin_prefix: e.target.value })}
                    fullWidth
                    required
                  />
                </Box>
                <Box flex={1}>
                  <TextField
                    label="Stock Limit"
                    type="number"
                    placeholder="Leave empty for unlimited"
                    value={formData.stock_limit || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        stock_limit: e.target.value ? parseInt(e.target.value) : undefined,
                      })
                    }
                    fullWidth
                  />
                </Box>
              </Box>
            </Box>
          )}

          {/* Features Tab */}
          {currentTab === 2 && (
            <Box display="flex" flexDirection="column" gap={2}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.is_online_enabled}
                    onChange={(e) =>
                      setFormData({ ...formData, is_online_enabled: e.target.checked })
                    }
                  />
                }
                label="Online Payments Enabled"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.is_atm_enabled}
                    onChange={(e) =>
                      setFormData({ ...formData, is_atm_enabled: e.target.checked })
                    }
                  />
                }
                label="ATM Withdrawals Enabled"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.is_contactless_enabled}
                    onChange={(e) =>
                      setFormData({ ...formData, is_contactless_enabled: e.target.checked })
                    }
                  />
                }
                label="Contactless Payments"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.is_international_enabled}
                    onChange={(e) =>
                      setFormData({ ...formData, is_international_enabled: e.target.checked })
                    }
                  />
                }
                label="International Payments"
              />

              <Divider />

              <Typography variant="subtitle2">Feature List (for display)</Typography>
              <Box display="flex" gap={1}>
                <TextField
                  placeholder="e.g., Free airport lounge access"
                  value={featureInput}
                  onChange={(e) => setFeatureInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addFeature()}
                  fullWidth
                  size="small"
                />
                <Button onClick={addFeature} variant="outlined">
                  Add
                </Button>
              </Box>

              <Box display="flex" gap={1} flexWrap="wrap">
                {formData.features.map((feature, index) => (
                  <Chip
                    key={index}
                    label={feature}
                    onDelete={() => removeFeature(index)}
                  />
                ))}
              </Box>
            </Box>
          )}

          {/* Design Tab */}
          {currentTab === 3 && (
            <Box display="flex" flexDirection="column" gap={2}>
              <TextField
                label="Card Design URL"
                placeholder="https://example.com/card-design.png"
                value={formData.card_design_url}
                onChange={(e) => setFormData({ ...formData, card_design_url: e.target.value })}
                fullWidth
              />
              <Box display="flex" gap={2}>
                <Box flex={1}>
                  <TextField
                    label="Card Background Color"
                    type="color"
                    value={formData.card_color}
                    onChange={(e) => setFormData({ ...formData, card_color: e.target.value })}
                    fullWidth
                  />
                </Box>
                <Box flex={1}>
                  <TextField
                    label="Card Text Color"
                    type="color"
                    value={formData.card_text_color}
                    onChange={(e) =>
                      setFormData({ ...formData, card_text_color: e.target.value })
                    }
                    fullWidth
                  />
                </Box>
              </Box>

              <Divider />

              <FormControlLabel
                control={
                  <Switch
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  />
                }
                label="Active (can be purchased)"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.is_visible}
                    onChange={(e) => setFormData({ ...formData, is_visible: e.target.checked })}
                  />
                }
                label="Visible (show in marketplace)"
              />

              {/* Card Preview */}
              <Box
                sx={{
                  width: '100%',
                  height: 200,
                  borderRadius: 2,
                  background: formData.card_color,
                  color: formData.card_text_color,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  p: 3,
                }}
              >
                <Typography variant="h6">{formData.name}</Typography>
                <Box>
                  <Typography variant="body2">**** **** **** 1234</Typography>
                  <Typography variant="caption">12/30</Typography>
                </Box>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={editMode ? handleUpdateProduct : handleCreateProduct}
            variant="contained"
          >
            {editMode ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
      </Box>
    </AdminLayout>
  );
}
