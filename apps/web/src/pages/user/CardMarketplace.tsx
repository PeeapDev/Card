import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
} from '@mui/material';
import Grid from '@mui/material/Grid2';
import {
  CheckCircle as CheckIcon,
  CreditCard as CardIcon,
  AttachMoney as MoneyIcon,
  TrendingUp as TrendingUpIcon,
  Security as SecurityIcon,
} from '@mui/icons-material';

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
  transaction_fee_percent: number;
  is_online_enabled: boolean;
  is_atm_enabled: boolean;
  is_contactless_enabled: boolean;
  is_international_enabled: boolean;
  cashback_percent: number;
  features: string[];
  card_color: string;
  card_text_color: string;
  cards_issued: number;
}

interface UserWallet {
  id: string;
  balance: number;
  available_balance: number;
  currency: string;
}

const API_BASE = '/api';

export default function CardMarketplace() {
  const [products, setProducts] = useState<CardProduct[]>([]);
  const [userCards, setUserCards] = useState<string[]>([]);
  const [wallet, setWallet] = useState<UserWallet | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [purchaseDialogOpen, setPurchaseDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<CardProduct | null>(null);
  const [purchasing, setPurchasing] = useState(false);

  // Get userId from auth context or localStorage
  const userId = localStorage.getItem('userId') || '';

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      // Load available card products
      const productsResponse = await fetch(`${API_BASE}/card-products`);
      const productsData = await productsResponse.json();

      if (productsResponse.ok) {
        setProducts(productsData.products || []);
      }

      // Load user's existing cards
      if (userId) {
        const cardsResponse = await fetch(`${API_BASE}/cards/user/${userId}`);
        const cardsData = await cardsResponse.json();

        if (cardsResponse.ok) {
          const ownedProductIds = cardsData.cards.map((card: any) => card.card_product_id);
          setUserCards(ownedProductIds);
        }

        // Load user's wallet balance
        const walletsResponse = await fetch(`${API_BASE}/mobile-auth`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'wallets', userId }),
        });
        const walletsData = await walletsResponse.json();

        if (walletsResponse.ok && walletsData.wallets.length > 0) {
          setWallet(walletsData.wallets[0]);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handlePurchaseClick = (product: CardProduct) => {
    setSelectedProduct(product);
    setPurchaseDialogOpen(true);
  };

  const handleConfirmPurchase = async () => {
    if (!selectedProduct || !userId) return;

    try {
      setPurchasing(true);
      const response = await fetch(`${API_BASE}/cards/purchase`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          cardProductId: selectedProduct.id,
          paymentMethod: 'wallet',
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(`${selectedProduct.name} purchased successfully! Card Number: ${data.card.card_number}`);
        setPurchaseDialogOpen(false);
        loadData(); // Reload to update owned cards and balance
      } else {
        setError(data.error || 'Failed to purchase card');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to purchase card');
    } finally {
      setPurchasing(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-SL', {
      style: 'currency',
      currency: 'SLE',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getTierColor = (tier: number) => {
    switch (tier) {
      case 1:
        return '#607D8B'; // Gray for Basic
      case 2:
        return '#2196F3'; // Blue for Premium
      case 3:
        return '#9C27B0'; // Purple for Platinum
      default:
        return '#FFD700'; // Gold for higher tiers
    }
  };

  const isOwned = (productId: string) => userCards.includes(productId);

  const canAfford = (price: number) => {
    return wallet && wallet.available_balance >= price;
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box p={3}>
      <Typography variant="h4" mb={1}>
        Card Marketplace
      </Typography>
      <Typography variant="body1" color="text.secondary" mb={3}>
        Choose the perfect card for your needs
      </Typography>

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

      {wallet && (
        <Card sx={{ mb: 3, bgcolor: 'primary.main', color: 'white' }}>
          <CardContent>
            <Typography variant="h6">Your Wallet Balance</Typography>
            <Typography variant="h4">{formatCurrency(wallet.available_balance)}</Typography>
          </CardContent>
        </Card>
      )}

      <Grid container spacing={3}>
        {products.map((product) => {
          const owned = isOwned(product.id);
          const affordable = canAfford(product.purchase_price);

          return (
            <Grid item xs={12} md={6} lg={4} key={product.id}>
              <Card
                elevation={owned ? 10 : 3}
                sx={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  border: owned ? 3 : 0,
                  borderColor: 'success.main',
                  position: 'relative',
                }}
              >
                {owned && (
                  <Chip
                    label="OWNED"
                    color="success"
                    size="small"
                    sx={{
                      position: 'absolute',
                      top: 16,
                      right: 16,
                      zIndex: 1,
                    }}
                  />
                )}

                {/* Card Preview */}
                <Box
                  sx={{
                    height: 180,
                    background: product.card_color,
                    color: product.card_text_color,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    p: 3,
                    position: 'relative',
                    overflow: 'hidden',
                  }}
                >
                  <Box>
                    <Chip
                      label={`Tier ${product.tier}`}
                      size="small"
                      sx={{
                        bgcolor: 'rgba(255,255,255,0.2)',
                        color: product.card_text_color,
                      }}
                    />
                    <Typography variant="h5" mt={1}>
                      {product.name}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="h6" letterSpacing={2}>
                      •••• •••• •••• ••••
                    </Typography>
                    <Typography variant="caption">VALID THRU 12/30</Typography>
                  </Box>
                </Box>

                <CardContent sx={{ flexGrow: 1 }}>
                  <Typography variant="body2" color="text.secondary" mb={2}>
                    {product.description}
                  </Typography>

                  <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Purchase Price
                      </Typography>
                      <Typography variant="h5" color="primary.main">
                        {formatCurrency(product.purchase_price)}
                      </Typography>
                    </Box>
                    {product.annual_fee > 0 && (
                      <Box textAlign="right">
                        <Typography variant="caption" color="text.secondary">
                          Annual Fee
                        </Typography>
                        <Typography variant="body2">
                          {formatCurrency(product.annual_fee)}
                        </Typography>
                      </Box>
                    )}
                  </Box>

                  <Divider sx={{ my: 2 }} />

                  <Typography variant="subtitle2" mb={1}>
                    Features:
                  </Typography>
                  <Box display="flex" flexWrap="wrap" gap={0.5} mb={2}>
                    {product.is_online_enabled && (
                      <Chip label="Online" size="small" color="primary" />
                    )}
                    {product.is_atm_enabled && (
                      <Chip label="ATM" size="small" color="primary" />
                    )}
                    {product.is_contactless_enabled && (
                      <Chip label="Contactless" size="small" color="primary" />
                    )}
                    {product.is_international_enabled && (
                      <Chip label="International" size="small" color="primary" />
                    )}
                    {product.cashback_percent > 0 && (
                      <Chip
                        label={`${product.cashback_percent}% Cashback`}
                        size="small"
                        color="success"
                      />
                    )}
                  </Box>

                  <List dense>
                    {product.features.slice(0, 3).map((feature, index) => (
                      <ListItem key={index} disableGutters>
                        <ListItemIcon sx={{ minWidth: 32 }}>
                          <CheckIcon color="success" fontSize="small" />
                        </ListItemIcon>
                        <ListItemText
                          primary={feature}
                          primaryTypographyProps={{ variant: 'body2' }}
                        />
                      </ListItem>
                    ))}
                  </List>
                </CardContent>

                <Box p={2} pt={0}>
                  <Button
                    variant="contained"
                    fullWidth
                    onClick={() => handlePurchaseClick(product)}
                    disabled={owned || !affordable}
                    startIcon={<CardIcon />}
                  >
                    {owned
                      ? 'Already Owned'
                      : !affordable
                      ? 'Insufficient Balance'
                      : `Purchase for ${formatCurrency(product.purchase_price)}`}
                  </Button>
                </Box>
              </Card>
            </Grid>
          );
        })}
      </Grid>

      {/* Purchase Confirmation Dialog */}
      <Dialog
        open={purchaseDialogOpen}
        onClose={() => setPurchaseDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Confirm Card Purchase</DialogTitle>
        <DialogContent>
          {selectedProduct && (
            <Box>
              <Typography variant="body1" mb={2}>
                You are about to purchase the <strong>{selectedProduct.name}</strong>
              </Typography>

              <Card sx={{ mb: 2, bgcolor: 'grey.100' }}>
                <CardContent>
                  <Typography variant="h6" mb={2}>
                    Purchase Summary
                  </Typography>
                  <Box display="flex" justifyContent="space-between" mb={1}>
                    <Typography>Card Price:</Typography>
                    <Typography fontWeight="bold">
                      {formatCurrency(selectedProduct.purchase_price)}
                    </Typography>
                  </Box>
                  {wallet && (
                    <>
                      <Box display="flex" justifyContent="space-between" mb={1}>
                        <Typography>Current Balance:</Typography>
                        <Typography>{formatCurrency(wallet.available_balance)}</Typography>
                      </Box>
                      <Divider sx={{ my: 1 }} />
                      <Box display="flex" justifyContent="space-between">
                        <Typography fontWeight="bold">Balance After:</Typography>
                        <Typography fontWeight="bold" color="primary.main">
                          {formatCurrency(
                            wallet.available_balance - selectedProduct.purchase_price
                          )}
                        </Typography>
                      </Box>
                    </>
                  )}
                </CardContent>
              </Card>

              <Alert severity="info">
                Your new card will be instantly activated and ready to use!
              </Alert>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPurchaseDialogOpen(false)} disabled={purchasing}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirmPurchase}
            variant="contained"
            disabled={purchasing}
            startIcon={purchasing ? <CircularProgress size={20} /> : <CardIcon />}
          >
            {purchasing ? 'Processing...' : 'Confirm Purchase'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
