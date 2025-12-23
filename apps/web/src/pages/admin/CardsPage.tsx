import { useState, useEffect } from 'react';
import {
  CreditCard,
  Plus,
  Search,
  Filter,
  Download,
  Eye,
  Edit2,
  CheckCircle,
  XCircle,
  Clock,
  Snowflake,
  Trash2,
  ChevronDown,
  Package,
  Users,
  Wallet,
  Settings,
  RefreshCw,
  Layers,
  DollarSign,
  Calendar,
  Shield,
  Smartphone,
  X,
  Save,
  AlertCircle,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { supabase } from '@/lib/supabase';

// Types for NFC Card Programs
interface NFCCardProgram {
  id: string;
  program_code: string;
  program_name: string;
  description: string;
  card_category: 'ANONYMOUS' | 'NAMED' | 'CORPORATE' | 'GIFT';
  is_reloadable: boolean;
  requires_kyc: boolean;
  card_price: number;
  initial_balance: number;
  currency: string;
  max_balance: number;
  daily_transaction_limit: number;
  per_transaction_limit: number;
  transaction_fee_percentage: number;
  chip_type: string;
  validity_months: number;
  status: 'ACTIVE' | 'SUSPENDED' | 'DISCONTINUED';
  card_color_primary: string;
  card_color_secondary: string;
  created_at: string;
  // Stats
  total_cards?: number;
  active_cards?: number;
  sold_cards?: number;
}

interface NFCCardBatch {
  id: string;
  batch_code: string;
  program_id: string;
  card_count: number;
  status: string;
  cards_in_warehouse: number;
  cards_distributed: number;
  cards_sold: number;
  cards_activated: number;
  created_at: string;
}

export function CardsPage() {
  const [activeTab, setActiveTab] = useState<'programs' | 'batches' | 'cards'>('programs');
  const [programs, setPrograms] = useState<NFCCardProgram[]>([]);
  const [batches, setBatches] = useState<NFCCardBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [selectedProgram, setSelectedProgram] = useState<NFCCardProgram | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Stats
  const [stats, setStats] = useState({
    totalPrograms: 0,
    activePrograms: 0,
    totalCards: 0,
    activatedCards: 0,
    totalValue: 0,
  });

  // Form state for creating new program
  const [formData, setFormData] = useState({
    program_code: '',
    program_name: '',
    description: '',
    card_category: 'ANONYMOUS' as const,
    is_reloadable: false,
    requires_kyc: false,
    card_price: 50000,
    initial_balance: 45000,
    currency: 'SLE',
    max_balance: 1000000,
    daily_transaction_limit: 500000,
    per_transaction_limit: 200000,
    transaction_fee_percentage: 1.5,
    chip_type: 'DESFIRE_EV3',
    validity_months: 24,
    card_color_primary: '#1A1A2E',
    card_color_secondary: '#E94560',
  });

  // Batch form state
  const [batchForm, setBatchForm] = useState({
    program_id: '',
    card_count: 100,
    bin_prefix: '62000001',
    sequence_start: 1,
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch programs
      const { data: programData, error: programError } = await supabase
        .from('nfc_card_programs')
        .select('*')
        .order('created_at', { ascending: false });

      if (programError) throw programError;

      // Fetch card stats per program
      const { data: cardStats } = await supabase
        .from('nfc_prepaid_cards')
        .select('program_id, state');

      // Calculate stats per program
      const programsWithStats = (programData || []).map(program => {
        const programCards = cardStats?.filter(c => c.program_id === program.id) || [];
        return {
          ...program,
          total_cards: programCards.length,
          active_cards: programCards.filter(c => c.state === 'ACTIVATED').length,
          sold_cards: programCards.filter(c => ['SOLD', 'ACTIVATED'].includes(c.state)).length,
        };
      });

      setPrograms(programsWithStats);

      // Fetch batches
      const { data: batchData } = await supabase
        .from('nfc_card_batches')
        .select('*')
        .order('created_at', { ascending: false });

      setBatches(batchData || []);

      // Calculate overall stats
      const totalCards = cardStats?.length || 0;
      const activatedCards = cardStats?.filter(c => c.state === 'ACTIVATED').length || 0;

      setStats({
        totalPrograms: programsWithStats.length,
        activePrograms: programsWithStats.filter(p => p.status === 'ACTIVE').length,
        totalCards,
        activatedCards,
        totalValue: programsWithStats.reduce((sum, p) => sum + (p.total_cards || 0) * p.card_price, 0),
      });

    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProgram = async () => {
    try {
      const { data, error } = await supabase
        .from('nfc_card_programs')
        .insert({
          ...formData,
          status: 'ACTIVE',
        })
        .select()
        .single();

      if (error) throw error;

      setPrograms([{ ...data, total_cards: 0, active_cards: 0, sold_cards: 0 }, ...programs]);
      setShowCreateModal(false);
      resetForm();
    } catch (error: any) {
      console.error('Error creating program:', error);
      alert(error.message || 'Failed to create program');
    }
  };

  const handleCreateBatch = async () => {
    try {
      const program = programs.find(p => p.id === batchForm.program_id);
      if (!program) {
        alert('Please select a program');
        return;
      }

      // Generate batch code
      const batchCode = `BATCH-${Date.now().toString(36).toUpperCase()}`;

      // Create batch
      const { data: batch, error: batchError } = await supabase
        .from('nfc_card_batches')
        .insert({
          batch_code: batchCode,
          program_id: batchForm.program_id,
          card_count: batchForm.card_count,
          bin_prefix: batchForm.bin_prefix,
          sequence_start: batchForm.sequence_start,
          sequence_end: batchForm.sequence_start + batchForm.card_count - 1,
          status: 'MANUFACTURED',
          cards_in_warehouse: batchForm.card_count,
          cards_distributed: 0,
          cards_sold: 0,
          cards_activated: 0,
        })
        .select()
        .single();

      if (batchError) throw batchError;

      // Create individual cards with wallets
      const cards = [];
      const expiresAt = new Date();
      expiresAt.setMonth(expiresAt.getMonth() + program.validity_months);

      for (let i = 0; i < batchForm.card_count; i++) {
        const sequence = batchForm.sequence_start + i;
        const cardNumber = generateCardNumber(batchForm.bin_prefix, sequence);
        const cardUid = generateRandomHex(14); // 7 bytes
        const activationCode = generateRandomHex(12).toUpperCase();

        // Create a wallet for this card
        const { data: wallet, error: walletError } = await supabase
          .from('wallets')
          .insert({
            owner_type: 'CARD',
            owner_id: null, // Will be updated when card is created
            available_balance: 0,
            held_balance: 0,
            currency_code: program.currency,
            status: 'ACTIVE',
            daily_limit: program.daily_transaction_limit,
            monthly_limit: program.daily_transaction_limit * 30,
            single_transaction_limit: program.per_transaction_limit,
          })
          .select()
          .single();

        if (walletError) {
          console.error('Error creating wallet:', walletError);
          continue;
        }

        cards.push({
          card_number: cardNumber,
          card_uid: cardUid,
          card_uid_hash: await hashString(cardUid),
          program_id: batchForm.program_id,
          batch_id: batch.id,
          key_slot_id: `SLOT-${batch.id.substring(0, 8)}-${i}`,
          key_version: 1,
          state: 'CREATED',
          balance: 0,
          currency: program.currency,
          activation_code: activationCode,
          activation_code_hash: await hashString(activationCode),
          expires_at: expiresAt.toISOString(),
          wallet_id: wallet.id, // Link to the created wallet
        });
      }

      // Insert cards in batches of 100
      for (let i = 0; i < cards.length; i += 100) {
        const chunk = cards.slice(i, i + 100);
        const { error: cardError } = await supabase
          .from('nfc_prepaid_cards')
          .insert(chunk);

        if (cardError) {
          console.error('Error creating cards:', cardError);
        }
      }

      // Update wallet owner_id with card id
      const { data: createdCards } = await supabase
        .from('nfc_prepaid_cards')
        .select('id, wallet_id')
        .eq('batch_id', batch.id);

      if (createdCards) {
        for (const card of createdCards) {
          if (card.wallet_id) {
            await supabase
              .from('wallets')
              .update({ owner_id: card.id })
              .eq('id', card.wallet_id);
          }
        }
      }

      setBatches([batch, ...batches]);
      setShowBatchModal(false);
      setBatchForm({ program_id: '', card_count: 100, bin_prefix: '62000001', sequence_start: 1 });
      fetchData(); // Refresh stats

      alert(`Successfully created batch with ${batchForm.card_count} cards!`);

    } catch (error: any) {
      console.error('Error creating batch:', error);
      alert(error.message || 'Failed to create batch');
    }
  };

  const generateCardNumber = (binPrefix: string, sequence: number): string => {
    const partial = binPrefix + sequence.toString().padStart(7, '0');
    let sum = 0;
    for (let i = partial.length - 1; i >= 0; i--) {
      let digit = parseInt(partial[i], 10);
      if ((partial.length - i) % 2 === 0) {
        digit *= 2;
        if (digit > 9) digit -= 9;
      }
      sum += digit;
    }
    const checkDigit = ((10 - (sum % 10)) % 10).toString();
    return partial + checkDigit;
  };

  const generateRandomHex = (length: number): string => {
    const chars = '0123456789ABCDEF';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars[Math.floor(Math.random() * chars.length)];
    }
    return result;
  };

  const hashString = async (str: string): Promise<string> => {
    const encoder = new TextEncoder();
    const data = encoder.encode(str);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  const resetForm = () => {
    setFormData({
      program_code: '',
      program_name: '',
      description: '',
      card_category: 'ANONYMOUS',
      is_reloadable: false,
      requires_kyc: false,
      card_price: 50000,
      initial_balance: 45000,
      currency: 'SLE',
      max_balance: 1000000,
      daily_transaction_limit: 500000,
      per_transaction_limit: 200000,
      transaction_fee_percentage: 1.5,
      chip_type: 'DESFIRE_EV3',
      validity_months: 24,
      card_color_primary: '#1A1A2E',
      card_color_secondary: '#E94560',
    });
  };

  const toggleProgramStatus = async (program: NFCCardProgram) => {
    const newStatus = program.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    try {
      await supabase
        .from('nfc_card_programs')
        .update({ status: newStatus })
        .eq('id', program.id);

      setPrograms(programs.map(p =>
        p.id === program.id ? { ...p, status: newStatus } : p
      ));
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-SL', {
      style: 'currency',
      currency: 'SLE',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getCategoryBadge = (category: string) => {
    const colors: Record<string, string> = {
      ANONYMOUS: 'bg-gray-100 text-gray-700',
      NAMED: 'bg-blue-100 text-blue-700',
      CORPORATE: 'bg-purple-100 text-purple-700',
      GIFT: 'bg-pink-100 text-pink-700',
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[category] || 'bg-gray-100 text-gray-700'}`}>
        {category}
      </span>
    );
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      ACTIVE: 'bg-green-100 text-green-700',
      SUSPENDED: 'bg-yellow-100 text-yellow-700',
      DISCONTINUED: 'bg-red-100 text-red-700',
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[status] || 'bg-gray-100 text-gray-700'}`}>
        {status}
      </span>
    );
  };

  const filteredPrograms = programs.filter(p =>
    p.program_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.program_code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">NFC Card Programs</h1>
            <p className="text-gray-500">Create and manage physical NFC prepaid cards</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowBatchModal(true)}
              className="px-4 py-2 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
            >
              <Package className="w-4 h-4" />
              Create Batch
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              New Program
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Layers className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Programs</p>
                <p className="text-2xl font-bold">{stats.totalPrograms}</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Active Programs</p>
                <p className="text-2xl font-bold text-green-600">{stats.activePrograms}</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <CreditCard className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Cards</p>
                <p className="text-2xl font-bold text-purple-600">{stats.totalCards.toLocaleString()}</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-cyan-100 rounded-lg">
                <Smartphone className="w-5 h-5 text-cyan-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Activated</p>
                <p className="text-2xl font-bold text-cyan-600">{stats.activatedCards.toLocaleString()}</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <DollarSign className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Value</p>
                <p className="text-xl font-bold text-yellow-600">{formatCurrency(stats.totalValue)}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex gap-8">
            <button
              onClick={() => setActiveTab('programs')}
              className={`pb-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'programs'
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Card Programs
            </button>
            <button
              onClick={() => setActiveTab('batches')}
              className={`pb-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'batches'
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Batches ({batches.length})
            </button>
          </nav>
        </div>

        {/* Search */}
        <Card className="p-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search programs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
        </Card>

        {/* Content */}
        {activeTab === 'programs' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPrograms.map((program) => (
              <Card key={program.id} className="overflow-hidden">
                {/* Card Preview Header */}
                <div
                  className="h-32 p-4 flex flex-col justify-between"
                  style={{
                    background: `linear-gradient(135deg, ${program.card_color_primary} 0%, ${program.card_color_secondary} 100%)`,
                  }}
                >
                  <div className="flex justify-between items-start">
                    <span className="text-white text-xs font-medium bg-white/20 px-2 py-1 rounded">
                      {program.program_code}
                    </span>
                    {getStatusBadge(program.status)}
                  </div>
                  <div>
                    <p className="text-white/80 text-xs">NFC Prepaid</p>
                    <p className="text-white font-bold">{program.program_name}</p>
                  </div>
                </div>

                {/* Card Details */}
                <div className="p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    {getCategoryBadge(program.card_category)}
                    <div className="flex gap-2">
                      {program.is_reloadable && (
                        <span className="text-xs bg-green-50 text-green-600 px-2 py-0.5 rounded">Reloadable</span>
                      )}
                      {program.requires_kyc && (
                        <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded">KYC</span>
                      )}
                    </div>
                  </div>

                  <p className="text-sm text-gray-600 line-clamp-2">
                    {program.description || 'No description'}
                  </p>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500">Card Price</p>
                      <p className="font-bold text-lg">{formatCurrency(program.card_price)}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Initial Balance</p>
                      <p className="font-bold text-lg text-green-600">{formatCurrency(program.initial_balance)}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center py-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="text-lg font-bold">{program.total_cards || 0}</p>
                      <p className="text-xs text-gray-500">Total</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-blue-600">{program.sold_cards || 0}</p>
                      <p className="text-xs text-gray-500">Sold</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-green-600">{program.active_cards || 0}</p>
                      <p className="text-xs text-gray-500">Active</p>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={() => {
                        setBatchForm({ ...batchForm, program_id: program.id });
                        setShowBatchModal(true);
                      }}
                      className="flex-1 px-3 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center justify-center gap-2"
                    >
                      <Package className="w-4 h-4" />
                      Create Cards
                    </button>
                    <button
                      onClick={() => toggleProgramStatus(program)}
                      className={`px-3 py-2 text-sm rounded-lg flex items-center justify-center ${
                        program.status === 'ACTIVE'
                          ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                          : 'bg-green-100 text-green-700 hover:bg-green-200'
                      }`}
                    >
                      {program.status === 'ACTIVE' ? (
                        <Snowflake className="w-4 h-4" />
                      ) : (
                        <CheckCircle className="w-4 h-4" />
                      )}
                    </button>
                    <button className="px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">
                      <Eye className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </Card>
            ))}

            {filteredPrograms.length === 0 && (
              <div className="col-span-full text-center py-12">
                <CreditCard className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No card programs found</p>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="mt-4 px-4 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                >
                  Create First Program
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'batches' && (
          <Card className="overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Batch Code</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Program</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Cards</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Progress</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {batches.map((batch) => {
                  const program = programs.find(p => p.id === batch.program_id);
                  const progress = batch.card_count > 0 ? (batch.cards_activated / batch.card_count) * 100 : 0;

                  return (
                    <tr key={batch.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <span className="font-mono text-sm">{batch.batch_code}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm">{program?.program_name || 'Unknown'}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-medium">{batch.card_count}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                          {batch.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-green-500 rounded-full"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-500 w-12">
                            {batch.cards_activated}/{batch.card_count}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-500">
                          {new Date(batch.created_at).toLocaleDateString()}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>
        )}

        {/* Create Program Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b flex justify-between items-center sticky top-0 bg-white">
                <h2 className="text-xl font-bold">Create Card Program</h2>
                <button onClick={() => setShowCreateModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                {/* Basic Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Program Code</label>
                    <input
                      type="text"
                      value={formData.program_code}
                      onChange={(e) => setFormData({ ...formData, program_code: e.target.value.toUpperCase() })}
                      placeholder="NFC-ANON-50"
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Program Name</label>
                    <input
                      type="text"
                      value={formData.program_name}
                      onChange={(e) => setFormData({ ...formData, program_name: e.target.value })}
                      placeholder="Basic Prepaid Card"
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={2}
                    placeholder="Description of the card program..."
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                {/* Category and Features */}
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                    <select
                      value={formData.card_category}
                      onChange={(e) => setFormData({ ...formData, card_category: e.target.value as any })}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="ANONYMOUS">Anonymous</option>
                      <option value="NAMED">Named (KYC)</option>
                      <option value="CORPORATE">Corporate</option>
                      <option value="GIFT">Gift Card</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-2 pt-6">
                    <input
                      type="checkbox"
                      id="reloadable"
                      checked={formData.is_reloadable}
                      onChange={(e) => setFormData({ ...formData, is_reloadable: e.target.checked })}
                      className="rounded border-gray-300"
                    />
                    <label htmlFor="reloadable" className="text-sm">Reloadable</label>
                  </div>
                  <div className="flex items-center gap-2 pt-6">
                    <input
                      type="checkbox"
                      id="kyc"
                      checked={formData.requires_kyc}
                      onChange={(e) => setFormData({ ...formData, requires_kyc: e.target.checked })}
                      className="rounded border-gray-300"
                    />
                    <label htmlFor="kyc" className="text-sm">Requires KYC</label>
                  </div>
                </div>

                {/* Pricing */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Card Price (SLE)</label>
                    <input
                      type="number"
                      value={formData.card_price}
                      onChange={(e) => setFormData({ ...formData, card_price: Number(e.target.value) })}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Initial Balance (SLE)</label>
                    <input
                      type="number"
                      value={formData.initial_balance}
                      onChange={(e) => setFormData({ ...formData, initial_balance: Number(e.target.value) })}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                </div>

                {/* Limits */}
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Daily Limit</label>
                    <input
                      type="number"
                      value={formData.daily_transaction_limit}
                      onChange={(e) => setFormData({ ...formData, daily_transaction_limit: Number(e.target.value) })}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Per Transaction</label>
                    <input
                      type="number"
                      value={formData.per_transaction_limit}
                      onChange={(e) => setFormData({ ...formData, per_transaction_limit: Number(e.target.value) })}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Max Balance</label>
                    <input
                      type="number"
                      value={formData.max_balance}
                      onChange={(e) => setFormData({ ...formData, max_balance: Number(e.target.value) })}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                </div>

                {/* Validity and Fee */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Validity (months)</label>
                    <input
                      type="number"
                      value={formData.validity_months}
                      onChange={(e) => setFormData({ ...formData, validity_months: Number(e.target.value) })}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Transaction Fee (%)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={formData.transaction_fee_percentage}
                      onChange={(e) => setFormData({ ...formData, transaction_fee_percentage: Number(e.target.value) })}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                </div>

                {/* Card Design */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Primary Color</label>
                    <input
                      type="color"
                      value={formData.card_color_primary}
                      onChange={(e) => setFormData({ ...formData, card_color_primary: e.target.value })}
                      className="w-full h-10 border rounded-lg cursor-pointer"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Secondary Color</label>
                    <input
                      type="color"
                      value={formData.card_color_secondary}
                      onChange={(e) => setFormData({ ...formData, card_color_secondary: e.target.value })}
                      className="w-full h-10 border rounded-lg cursor-pointer"
                    />
                  </div>
                </div>

                {/* Preview */}
                <div
                  className="h-40 rounded-xl p-4 flex flex-col justify-between"
                  style={{
                    background: `linear-gradient(135deg, ${formData.card_color_primary} 0%, ${formData.card_color_secondary} 100%)`,
                  }}
                >
                  <div className="flex justify-between">
                    <span className="text-white/80 text-xs">{formData.program_code || 'PROGRAM-CODE'}</span>
                    <Shield className="w-5 h-5 text-white/50" />
                  </div>
                  <div>
                    <p className="text-white/70 text-xs">NFC Prepaid Card</p>
                    <p className="text-white font-bold text-lg">{formData.program_name || 'Program Name'}</p>
                    <p className="text-white/80 text-sm mt-2">{formatCurrency(formData.initial_balance)} Balance</p>
                  </div>
                </div>
              </div>

              <div className="p-6 border-t flex justify-end gap-3 sticky bottom-0 bg-white">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateProgram}
                  className="px-4 py-2 text-sm text-white bg-primary-600 rounded-lg hover:bg-primary-700 flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  Create Program
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Create Batch Modal */}
        {showBatchModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-md w-full">
              <div className="p-6 border-b flex justify-between items-center">
                <h2 className="text-xl font-bold">Create Card Batch</h2>
                <button onClick={() => setShowBatchModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Select Program</label>
                  <select
                    value={batchForm.program_id}
                    onChange={(e) => setBatchForm({ ...batchForm, program_id: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">Choose a program...</option>
                    {programs.filter(p => p.status === 'ACTIVE').map(p => (
                      <option key={p.id} value={p.id}>
                        {p.program_name} ({formatCurrency(p.card_price)})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Number of Cards</label>
                  <input
                    type="number"
                    value={batchForm.card_count}
                    onChange={(e) => setBatchForm({ ...batchForm, card_count: Number(e.target.value) })}
                    min={1}
                    max={10000}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">Each card will have its own wallet created</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">BIN Prefix</label>
                  <input
                    type="text"
                    value={batchForm.bin_prefix}
                    onChange={(e) => setBatchForm({ ...batchForm, bin_prefix: e.target.value })}
                    maxLength={8}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Starting Sequence</label>
                  <input
                    type="number"
                    value={batchForm.sequence_start}
                    onChange={(e) => setBatchForm({ ...batchForm, sequence_start: Number(e.target.value) })}
                    min={1}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                {batchForm.program_id && (
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm font-medium text-gray-700 mb-2">Batch Summary</p>
                    <div className="text-sm text-gray-600 space-y-1">
                      <p>Cards to create: <span className="font-bold">{batchForm.card_count}</span></p>
                      <p>
                        Total value:{' '}
                        <span className="font-bold">
                          {formatCurrency(
                            batchForm.card_count * (programs.find(p => p.id === batchForm.program_id)?.card_price || 0)
                          )}
                        </span>
                      </p>
                      <p className="text-xs text-blue-600 flex items-center gap-1 mt-2">
                        <Wallet className="w-3 h-3" />
                        Each card will have a dedicated wallet
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div className="p-6 border-t flex justify-end gap-3">
                <button
                  onClick={() => setShowBatchModal(false)}
                  className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateBatch}
                  disabled={!batchForm.program_id || batchForm.card_count < 1}
                  className="px-4 py-2 text-sm text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <Package className="w-4 h-4" />
                  Create {batchForm.card_count} Cards
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
