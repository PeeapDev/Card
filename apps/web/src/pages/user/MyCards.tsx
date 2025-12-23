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
  TextField,
  Tabs,
  Tab,
} from '@mui/material';
import {
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  ContentCopy as CopyIcon,
  CreditCard as CardIcon,
  Lock as LockIcon,
  CheckCircle as CheckCircleIcon,
  Nfc as NfcIcon,
  Add as AddIcon,
  Wallet as WalletIcon,
  Refresh as RefreshIcon,
  Block as BlockIcon,
  AcUnit as FreezeIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';

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

interface NFCCard {
  id: string;
  card_number: string;
  state: string;
  balance: number;
  currency: string;
  expires_at: string;
  activated_at: string | null;
  card_label: string | null;
  daily_spent: number;
  daily_limit: number | null;
  wallet_id: string | null;
  program: {
    program_name: string;
    card_color_primary: string;
    card_color_secondary: string;
    is_reloadable: boolean;
    daily_transaction_limit: number;
    per_transaction_limit: number;
  };
}

const API_BASE = '/api';

export default function MyCardsPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(0);
  const [cards, setCards] = useState<UserCard[]>([]);
  const [nfcCards, setNfcCards] = useState<NFCCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [visibleCards, setVisibleCards] = useState<{ [key: string]: boolean }>({});
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [selectedCard, setSelectedCard] = useState<UserCard | null>(null);

  // Activation dialog state
  const [activationDialogOpen, setActivationDialogOpen] = useState(false);
  const [activationCode, setActivationCode] = useState('');
  const [activating, setActivating] = useState(false);

  // Get userId from auth context or localStorage
  const userId = localStorage.getItem('userId') || '';

  useEffect(() => {
    if (userId) {
      loadCards();
      loadNFCCards();
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
        // Don't show error for empty cards
        setCards([]);
      }
    } catch (err: any) {
      setCards([]);
    } finally {
      setLoading(false);
    }
  };

  const loadNFCCards = async () => {
    try {
      const { data, error } = await supabase
        .from('nfc_prepaid_cards')
        .select(`
          *,
          program:nfc_card_programs(
            program_name,
            card_color_primary,
            card_color_secondary,
            is_reloadable,
            daily_transaction_limit,
            per_transaction_limit
          )
        `)
        .eq('user_id', userId)
        .in('state', ['ACTIVATED', 'SUSPENDED'])
        .order('activated_at', { ascending: false });

      if (error) {
        console.error('Error loading NFC cards:', error);
        return;
      }

      setNfcCards(data || []);
    } catch (err) {
      console.error('Error loading NFC cards:', err);
    }
  };

  const handleActivateCard = async () => {
    if (!activationCode.trim()) {
      setError('Please enter an activation code');
      return;
    }

    setActivating(true);
    setError('');

    try {
      // Find card by activation code
      const codeHash = await hashString(activationCode.toUpperCase());

      const { data: card, error: findError } = await supabase
        .from('nfc_prepaid_cards')
        .select(`
          *,
          program:nfc_card_programs(*)
        `)
        .eq('activation_code_hash', codeHash)
        .in('state', ['SOLD', 'INACTIVE', 'CREATED', 'ISSUED'])
        .single();

      if (findError || !card) {
        setError('Invalid activation code or card already activated');
        setActivating(false);
        return;
      }

      // Check if card is expired
      if (new Date(card.expires_at) < new Date()) {
        setError('This card has expired');
        setActivating(false);
        return;
      }

      // Get user's main wallet or create connection
      const { data: userWallet } = await supabase
        .from('wallets')
        .select('id')
        .eq('owner_id', userId)
        .eq('owner_type', 'USER')
        .single();

      // Activate the card
      const { error: updateError } = await supabase
        .from('nfc_prepaid_cards')
        .update({
          state: 'ACTIVATED',
          user_id: userId,
          balance: card.program.initial_balance,
          activated_at: new Date().toISOString(),
          activation_code: null, // Clear the code after use
        })
        .eq('id', card.id);

      if (updateError) {
        setError('Failed to activate card');
        setActivating(false);
        return;
      }

      // Update the card's wallet balance
      if (card.wallet_id) {
        await supabase
          .from('wallets')
          .update({
            available_balance: card.program.initial_balance,
            owner_id: card.id,
          })
          .eq('id', card.wallet_id);
      }

      // Create activation transaction
      await supabase.from('nfc_card_transactions').insert({
        transaction_reference: `ACT-${Date.now()}`,
        card_id: card.id,
        transaction_type: 'ACTIVATION_CREDIT',
        amount: card.program.initial_balance,
        fee_amount: 0,
        net_amount: card.program.initial_balance,
        currency: card.currency,
        balance_before: 0,
        balance_after: card.program.initial_balance,
        state: 'CAPTURED',
        captured_at: new Date().toISOString(),
      });

      setSuccess(`Card activated successfully! Balance: Le ${card.program.initial_balance.toLocaleString()}`);
      setActivationDialogOpen(false);
      setActivationCode('');
      loadNFCCards();

    } catch (err: any) {
      setError(err.message || 'Activation failed');
    } finally {
      setActivating(false);
    }
  };

  const handleFreezeCard = async (cardId: string, currentState: string) => {
    const newState = currentState === 'ACTIVATED' ? 'SUSPENDED' : 'ACTIVATED';

    try {
      const { error } = await supabase
        .from('nfc_prepaid_cards')
        .update({
          state: newState,
          suspended_at: newState === 'SUSPENDED' ? new Date().toISOString() : null,
        })
        .eq('id', cardId)
        .eq('user_id', userId);

      if (error) throw error;

      setSuccess(newState === 'SUSPENDED' ? 'Card frozen' : 'Card unfrozen');
      loadNFCCards();
    } catch (err: any) {
      setError(err.message || 'Failed to update card');
    }
  };

  const hashString = async (str: string): Promise<string> => {
    const encoder = new TextEncoder();
    const data = encoder.encode(str);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
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

  const formatCurrency = (amount: number, currency = 'SLE') => {
    return new Intl.NumberFormat('en-SL', {
      style: 'currency',
      currency: currency,
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
      case 'ACTIVATED':
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

  const hasNoCards = cards.length === 0 && nfcCards.length === 0;

  return (
    <Box p={3}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">My Cards</Typography>
        <Box display="flex" gap={2}>
          <Button
            variant="contained"
            color="primary"
            onClick={() => setActivationDialogOpen(true)}
            startIcon={<NfcIcon />}
          >
            Activate NFC Card
          </Button>
          <Button
            variant="outlined"
            onClick={() => navigate('/user/card-marketplace')}
            startIcon={<CardIcon />}
          >
            Get More Cards
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

      {/* Tabs */}
      <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} sx={{ mb: 3 }}>
        <Tab label={`NFC Cards (${nfcCards.length})`} icon={<NfcIcon />} iconPosition="start" />
        <Tab label={`Virtual Cards (${cards.length})`} icon={<CardIcon />} iconPosition="start" />
      </Tabs>

      {/* NFC Cards Tab */}
      {activeTab === 0 && (
        <>
          {nfcCards.length === 0 ? (
            <Card>
              <CardContent>
                <Box display="flex" flexDirection="column" alignItems="center" py={6}>
                  <NfcIcon sx={{ fontSize: 80, color: 'grey.400', mb: 2 }} />
                  <Typography variant="h6" gutterBottom>
                    No NFC Cards Yet
                  </Typography>
                  <Typography variant="body2" color="text.secondary" mb={3} textAlign="center">
                    Activate a physical NFC prepaid card using the activation code on your card
                  </Typography>
                  <Button
                    variant="contained"
                    onClick={() => setActivationDialogOpen(true)}
                    startIcon={<NfcIcon />}
                  >
                    Activate NFC Card
                  </Button>
                </Box>
              </CardContent>
            </Card>
          ) : (
            <Box display="flex" flexWrap="wrap" gap={3}>
              {nfcCards.map((card) => (
                <Box flex="1 1 300px" minWidth="300px" maxWidth="400px" key={card.id}>
                  <Card elevation={3}>
                    {/* Card Visual */}
                    <Box
                      sx={{
                        height: 200,
                        background: `linear-gradient(135deg, ${card.program.card_color_primary} 0%, ${card.program.card_color_secondary} 100%)`,
                        color: '#fff',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        p: 3,
                        position: 'relative',
                      }}
                    >
                      <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                        <Box>
                          <Chip
                            label={card.program.program_name}
                            size="small"
                            sx={{
                              bgcolor: 'rgba(255,255,255,0.2)',
                              color: '#fff',
                            }}
                          />
                          <Chip
                            label={card.state}
                            size="small"
                            color={getStatusColor(card.state)}
                            sx={{ ml: 1 }}
                          />
                        </Box>
                        <NfcIcon sx={{ opacity: 0.5 }} />
                      </Box>

                      <Box>
                        <Typography variant="h6" letterSpacing={2} mb={1}>
                          {visibleCards[card.id]
                            ? maskCardNumber(card.card_number)
                            : `•••• •••• •••• ${card.card_number.slice(-4)}`}
                        </Typography>
                        <Box display="flex" justifyContent="space-between" alignItems="center">
                          <Box>
                            <Typography variant="caption" sx={{ opacity: 0.7 }}>BALANCE</Typography>
                            <Typography variant="h5" fontWeight="bold">
                              {formatCurrency(card.balance, card.currency)}
                            </Typography>
                          </Box>
                          <Box textAlign="right">
                            <Typography variant="caption" sx={{ opacity: 0.7 }}>EXPIRES</Typography>
                            <Typography variant="body2">
                              {new Date(card.expires_at).toLocaleDateString('en-US', { month: '2-digit', year: '2-digit' })}
                            </Typography>
                          </Box>
                        </Box>
                      </Box>

                      <Box position="absolute" top={16} right={16}>
                        <IconButton
                          size="small"
                          onClick={() => toggleCardVisibility(card.id)}
                          sx={{ color: '#fff' }}
                        >
                          {visibleCards[card.id] ? <VisibilityOffIcon /> : <VisibilityIcon />}
                        </IconButton>
                      </Box>
                    </Box>

                    <CardContent>
                      {card.card_label && (
                        <Typography variant="subtitle2" color="text.secondary" mb={1}>
                          {card.card_label}
                        </Typography>
                      )}

                      <Box display="flex" justifyContent="space-between" mb={2}>
                        <Box>
                          <Typography variant="caption" color="text.secondary">
                            Daily Limit
                          </Typography>
                          <Typography variant="body2" fontWeight="bold">
                            {formatCurrency(card.daily_limit || card.program.daily_transaction_limit)}
                          </Typography>
                        </Box>
                        <Box textAlign="right">
                          <Typography variant="caption" color="text.secondary">
                            Daily Spent
                          </Typography>
                          <Typography variant="body2" fontWeight="bold">
                            {formatCurrency(card.daily_spent)}
                          </Typography>
                        </Box>
                      </Box>

                      <Box display="flex" gap={0.5} flexWrap="wrap" mb={2}>
                        <Chip label="NFC" size="small" color="primary" />
                        {card.program.is_reloadable && (
                          <Chip label="Reloadable" size="small" color="success" />
                        )}
                        {card.wallet_id && (
                          <Chip label="Wallet Linked" size="small" icon={<WalletIcon />} />
                        )}
                      </Box>

                      <Box display="flex" gap={1}>
                        <Button
                          variant="outlined"
                          size="small"
                          fullWidth
                          onClick={() => navigate(`/user/nfc-card/${card.id}`)}
                        >
                          View Details
                        </Button>
                        <Tooltip title={card.state === 'ACTIVATED' ? 'Freeze Card' : 'Unfreeze Card'}>
                          <IconButton
                            size="small"
                            color={card.state === 'ACTIVATED' ? 'warning' : 'success'}
                            onClick={() => handleFreezeCard(card.id, card.state)}
                          >
                            {card.state === 'ACTIVATED' ? <FreezeIcon /> : <RefreshIcon />}
                          </IconButton>
                        </Tooltip>
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
                </Box>
              ))}
            </Box>
          )}
        </>
      )}

      {/* Virtual Cards Tab */}
      {activeTab === 1 && (
        <>
          {cards.length === 0 ? (
            <Card>
              <CardContent>
                <Box display="flex" flexDirection="column" alignItems="center" py={6}>
                  <CardIcon sx={{ fontSize: 80, color: 'grey.400', mb: 2 }} />
                  <Typography variant="h6" gutterBottom>
                    No Virtual Cards Yet
                  </Typography>
                  <Typography variant="body2" color="text.secondary" mb={3}>
                    Purchase your first virtual card to get started
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
          ) : (
            <Box display="flex" flexWrap="wrap" gap={3}>
              {cards.map((card) => {
                const isVisible = visibleCards[card.id];
                const expiringSoon = isCardExpiringSoon(card);

                return (
                  <Box flex="1 1 300px" minWidth="300px" maxWidth="400px" key={card.id}>
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
                  </Box>
                );
              })}
            </Box>
          )}
        </>
      )}

      {/* NFC Card Activation Dialog */}
      <Dialog
        open={activationDialogOpen}
        onClose={() => setActivationDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <NfcIcon color="primary" />
            Activate NFC Card
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box py={2}>
            <Typography variant="body2" color="text.secondary" mb={3}>
              Enter the 12-character activation code found on your physical NFC prepaid card.
            </Typography>

            <TextField
              fullWidth
              label="Activation Code"
              value={activationCode}
              onChange={(e) => setActivationCode(e.target.value.toUpperCase())}
              placeholder="XXXXXXXXXXXX"
              inputProps={{ maxLength: 12, style: { letterSpacing: '2px', fontFamily: 'monospace' } }}
              helperText="The code is printed on your card or card packaging"
            />

            <Alert severity="info" sx={{ mt: 2 }}>
              <Typography variant="body2">
                Once activated, the card's initial balance will be credited and you can start using it for payments.
              </Typography>
            </Alert>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setActivationDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleActivateCard}
            disabled={activating || activationCode.length < 6}
            startIcon={activating ? <CircularProgress size={20} /> : <CheckCircleIcon />}
          >
            {activating ? 'Activating...' : 'Activate Card'}
          </Button>
        </DialogActions>
      </Dialog>

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

              <Box display="flex" flexWrap="wrap" gap={2}>
                <Box flex="1 1 200px">
                  <Typography variant="caption" color="text.secondary">
                    Card Number
                  </Typography>
                  <Typography variant="body2">
                    {maskCardNumber(selectedCard.card_number)}
                  </Typography>
                </Box>
                <Box flex="1 1 200px">
                  <Typography variant="caption" color="text.secondary">
                    Expiry
                  </Typography>
                  <Typography variant="body2">
                    {String(selectedCard.expiry_month).padStart(2, '0')}/
                    {selectedCard.expiry_year}
                  </Typography>
                </Box>
                <Box flex="1 1 200px">
                  <Typography variant="caption" color="text.secondary">
                    CVV
                  </Typography>
                  <Typography variant="body2">{selectedCard.cvv}</Typography>
                </Box>
                <Box flex="1 1 200px">
                  <Typography variant="caption" color="text.secondary">
                    Status
                  </Typography>
                  <Chip
                    label={selectedCard.status}
                    size="small"
                    color={getStatusColor(selectedCard.status)}
                  />
                </Box>
                <Box flex="1 1 100%">
                  <Typography variant="caption" color="text.secondary">
                    Purchased On
                  </Typography>
                  <Typography variant="body2">
                    {new Date(selectedCard.purchased_at).toLocaleDateString()} for{' '}
                    {formatCurrency(selectedCard.purchase_amount)}
                  </Typography>
                </Box>
                <Box flex="1 1 100%">
                  <Typography variant="caption" color="text.secondary">
                    Annual Fee Due
                  </Typography>
                  <Typography variant="body2">
                    {new Date(selectedCard.annual_fee_due_date).toLocaleDateString()}
                  </Typography>
                </Box>
              </Box>

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
