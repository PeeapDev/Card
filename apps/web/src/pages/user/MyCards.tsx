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
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
} from '@mui/material';
import {
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  ContentCopy as CopyIcon,
  CreditCard as CardIcon,
  Lock as LockIcon,
  CheckCircle as CheckCircleIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

interface CardProduct {
  id: string;
  name: string;
  tier: number;
  card_color: string;
  card_text_color: string;
  daily_transaction_limit: number;
  monthly_transaction_limit: number;
  transaction_fee_percent: number;
  is_online_enabled: boolean;
  is_atm_enabled: boolean;
  is_contactless_enabled: boolean;
  is_international_enabled: boolean;
  cashback_percent: number;
}

interface UserCard {
  id: string;
  card_number: string;
  last_four: string;
  expiry_month: number;
  expiry_year: number;
  cvv: string;
  status: string;
  purchased_at: string;
  purchase_amount: number;
  annual_fee_due_date: string;
  daily_limit: number;
  monthly_limit: number;
  is_online_enabled: boolean;
  card_product: CardProduct;
}

const API_BASE = '/api';

export default function MyCardsPage() {
  const navigate = useNavigate();
  const [cards, setCards] = useState<UserCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [visibleCards, setVisibleCards] = useState<{ [key: string]: boolean }>({});
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [selectedCard, setSelectedCard] = useState<UserCard | null>(null);

  // Get userId from auth context or localStorage
  const userId = localStorage.getItem('userId') || '';

  useEffect(() => {
    if (userId) {
      loadCards();
    }
  }, [userId]);

  const loadCards = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/cards/user/${userId}`);
      const data = await response.json();

      if (response.ok) {
        setCards(data.cards || []);
      } else {
        setError(data.error || 'Failed to load cards');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load cards');
    } finally {
      setLoading(false);
    }
  };

  const toggleCardVisibility = (cardId: string) => {
    setVisibleCards((prev) => ({
      ...prev,
      [cardId]: !prev[cardId],
    }));
  };

  const maskCardNumber = (cardNumber: string) => {
    return cardNumber.replace(/(\d{4})(?=\d)/g, '$1 ');
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setSuccess(`${label} copied to clipboard`);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-SL', {
      style: 'currency',
      currency: 'SLE',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const isCardExpiringSoon = (card: UserCard) => {
    const today = new Date();
    const expiryDate = new Date(card.expiry_year, card.expiry_month - 1);
    const monthsUntilExpiry = (expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24 * 30);
    return monthsUntilExpiry < 3 && monthsUntilExpiry > 0;
  };

  const getStatusColor = (status: string) => {
    switch (status.toUpperCase()) {
      case 'ACTIVE':
        return 'success';
      case 'BLOCKED':
        return 'error';
      case 'SUSPENDED':
        return 'warning';
      default:
        return 'default';
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (cards.length === 0) {
    return (
      <Box p={3}>
        <Typography variant="h4" mb={2}>
          My Cards
        </Typography>
        <Card>
          <CardContent>
            <Box display="flex" flexDirection="column" alignItems="center" py={6}>
              <CardIcon sx={{ fontSize: 80, color: 'grey.400', mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                No Cards Yet
              </Typography>
              <Typography variant="body2" color="text.secondary" mb={3}>
                Purchase your first card to get started
              </Typography>
              <Button
                variant="contained"
                onClick={() => navigate('/user/card-marketplace')}
                startIcon={<CardIcon />}
              >
                Browse Card Marketplace
              </Button>
            </Box>
          </CardContent>
        </Card>
      </Box>
    );
  }

  return (
    <Box p={3}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">My Cards</Typography>
        <Button
          variant="outlined"
          onClick={() => navigate('/user/card-marketplace')}
          startIcon={<CardIcon />}
        >
          Get More Cards
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

      <Grid container spacing={3}>
        {cards.map((card) => {
          const isVisible = visibleCards[card.id];
          const expiringSoon = isCardExpiringSoon(card);

          return (
            <Grid item xs={12} md={6} lg={4} key={card.id}>
              <Card elevation={3}>
                {/* Card Visual */}
                <Box
                  sx={{
                    height: 200,
                    background: card.card_product.card_color,
                    color: card.card_product.card_text_color,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    p: 3,
                    position: 'relative',
                  }}
                >
                  <Box>
                    <Chip
                      label={card.card_product.name}
                      size="small"
                      sx={{
                        bgcolor: 'rgba(255,255,255,0.2)',
                        color: card.card_product.card_text_color,
                      }}
                    />
                    <Chip
                      label={card.status}
                      size="small"
                      color={getStatusColor(card.status)}
                      sx={{ ml: 1 }}
                    />
                  </Box>

                  <Box>
                    <Typography variant="h6" letterSpacing={2} mb={1}>
                      {isVisible
                        ? maskCardNumber(card.card_number)
                        : `•••• •••• •••• ${card.last_four}`}
                    </Typography>
                    <Box display="flex" justifyContent="space-between" alignItems="center">
                      <Box>
                        <Typography variant="caption">VALID THRU</Typography>
                        <Typography variant="body2">
                          {String(card.expiry_month).padStart(2, '0')}/{card.expiry_year % 100}
                        </Typography>
                      </Box>
                      {isVisible && (
                        <Box textAlign="right">
                          <Typography variant="caption">CVV</Typography>
                          <Typography variant="body2">{card.cvv}</Typography>
                        </Box>
                      )}
                    </Box>
                  </Box>

                  <Box position="absolute" top={16} right={16}>
                    <IconButton
                      size="small"
                      onClick={() => toggleCardVisibility(card.id)}
                      sx={{ color: card.card_product.card_text_color }}
                    >
                      {isVisible ? <VisibilityOffIcon /> : <VisibilityIcon />}
                    </IconButton>
                  </Box>
                </Box>

                <CardContent>
                  {expiringSoon && (
                    <Alert severity="warning" sx={{ mb: 2 }}>
                      Card expires soon. Renew before{' '}
                      {String(card.expiry_month).padStart(2, '0')}/{card.expiry_year}
                    </Alert>
                  )}

                  <Box display="flex" justifyContent="space-between" mb={2}>
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Daily Limit
                      </Typography>
                      <Typography variant="body2" fontWeight="bold">
                        {formatCurrency(card.daily_limit)}
                      </Typography>
                    </Box>
                    <Box textAlign="right">
                      <Typography variant="caption" color="text.secondary">
                        Fee
                      </Typography>
                      <Typography variant="body2" fontWeight="bold">
                        {card.card_product.transaction_fee_percent}%
                      </Typography>
                    </Box>
                  </Box>

                  <Box display="flex" gap={0.5} flexWrap="wrap" mb={2}>
                    {card.card_product.is_online_enabled && (
                      <Chip label="Online" size="small" />
                    )}
                    {card.card_product.is_atm_enabled && <Chip label="ATM" size="small" />}
                    {card.card_product.is_contactless_enabled && (
                      <Chip label="Contactless" size="small" />
                    )}
                    {card.card_product.is_international_enabled && (
                      <Chip label="International" size="small" />
                    )}
                    {card.card_product.cashback_percent > 0 && (
                      <Chip
                        label={`${card.card_product.cashback_percent}% Cashback`}
                        size="small"
                        color="success"
                      />
                    )}
                  </Box>

                  <Box display="flex" gap={1}>
                    <Button
                      variant="outlined"
                      size="small"
                      fullWidth
                      onClick={() => {
                        setSelectedCard(card);
                        setDetailsDialogOpen(true);
                      }}
                    >
                      Details
                    </Button>
                    <Tooltip title="Copy Card Number">
                      <IconButton
                        size="small"
                        onClick={() => copyToClipboard(card.card_number, 'Card number')}
                      >
                        <CopyIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>

      {/* Card Details Dialog */}
      <Dialog
        open={detailsDialogOpen}
        onClose={() => setDetailsDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Card Details</DialogTitle>
        <DialogContent>
          {selectedCard && (
            <Box>
              <Typography variant="h6" mb={2}>
                {selectedCard.card_product.name}
              </Typography>

              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">
                    Card Number
                  </Typography>
                  <Typography variant="body2">
                    {maskCardNumber(selectedCard.card_number)}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">
                    Expiry
                  </Typography>
                  <Typography variant="body2">
                    {String(selectedCard.expiry_month).padStart(2, '0')}/
                    {selectedCard.expiry_year}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">
                    CVV
                  </Typography>
                  <Typography variant="body2">{selectedCard.cvv}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">
                    Status
                  </Typography>
                  <Chip
                    label={selectedCard.status}
                    size="small"
                    color={getStatusColor(selectedCard.status)}
                  />
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="caption" color="text.secondary">
                    Purchased On
                  </Typography>
                  <Typography variant="body2">
                    {new Date(selectedCard.purchased_at).toLocaleDateString()} for{' '}
                    {formatCurrency(selectedCard.purchase_amount)}
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="caption" color="text.secondary">
                    Annual Fee Due
                  </Typography>
                  <Typography variant="body2">
                    {new Date(selectedCard.annual_fee_due_date).toLocaleDateString()}
                  </Typography>
                </Grid>
              </Grid>

              <Box mt={3}>
                <Typography variant="subtitle2" mb={1}>
                  Transaction Limits
                </Typography>
                <Box display="flex" justifyContent="space-between" mb={1}>
                  <Typography variant="body2">Daily Limit:</Typography>
                  <Typography variant="body2" fontWeight="bold">
                    {formatCurrency(selectedCard.daily_limit)}
                  </Typography>
                </Box>
                <Box display="flex" justifyContent="space-between">
                  <Typography variant="body2">Monthly Limit:</Typography>
                  <Typography variant="body2" fontWeight="bold">
                    {formatCurrency(selectedCard.monthly_limit)}
                  </Typography>
                </Box>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailsDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
