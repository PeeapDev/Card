import { useState } from 'react';
import {
  Layers,
  Plus,
  Search,
  Eye,
  Edit2,
  Settings,
  CheckCircle,
  XCircle,
  Pause,
  CreditCard,
  DollarSign,
  Users,
  Globe,
  Copy,
  MoreVertical,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { AdminLayout } from '@/components/layout/AdminLayout';

interface CardProgram {
  id: string;
  name: string;
  description: string;
  type: 'virtual' | 'physical' | 'both';
  brand: 'visa' | 'mastercard';
  currency: string[];
  status: 'active' | 'paused' | 'closed';
  totalCards: number;
  activeCards: number;
  spendLimit: number;
  monthlyVolume: number;
  createdAt: string;
}

export function CardProgramsPage() {
  const [searchQuery, setSearchQuery] = useState('');

  const [stats] = useState({
    totalPrograms: 5,
    activePrograms: 4,
    totalCardsIssued: 2341,
    monthlyVolume: 2456780.50,
  });

  const [programs] = useState<CardProgram[]>([
    {
      id: 'prog_001',
      name: 'Premium Virtual',
      description: 'High-limit virtual cards for premium customers',
      type: 'virtual',
      brand: 'visa',
      currency: ['USD', 'EUR', 'GBP'],
      status: 'active',
      totalCards: 1245,
      activeCards: 1189,
      spendLimit: 50000,
      monthlyVolume: 1250000,
      createdAt: '2023-06-15T10:00:00Z',
    },
    {
      id: 'prog_002',
      name: 'Business Physical',
      description: 'Physical cards for business customers with expense management',
      type: 'physical',
      brand: 'mastercard',
      currency: ['USD', 'EUR'],
      status: 'active',
      totalCards: 451,
      activeCards: 423,
      spendLimit: 100000,
      monthlyVolume: 850000,
      createdAt: '2023-08-01T10:00:00Z',
    },
    {
      id: 'prog_003',
      name: 'Standard Virtual',
      description: 'Entry-level virtual cards for individual customers',
      type: 'virtual',
      brand: 'visa',
      currency: ['USD'],
      status: 'active',
      totalCards: 520,
      activeCards: 478,
      spendLimit: 5000,
      monthlyVolume: 156780.50,
      createdAt: '2023-09-20T10:00:00Z',
    },
    {
      id: 'prog_004',
      name: 'NGN Virtual',
      description: 'Virtual cards for Nigerian market with NGN support',
      type: 'virtual',
      brand: 'visa',
      currency: ['NGN', 'USD'],
      status: 'active',
      totalCards: 125,
      activeCards: 66,
      spendLimit: 2000000,
      monthlyVolume: 200000,
      createdAt: '2024-01-02T10:00:00Z',
    },
    {
      id: 'prog_005',
      name: 'Legacy Program',
      description: 'Deprecated program - no new cards being issued',
      type: 'both',
      brand: 'mastercard',
      currency: ['USD'],
      status: 'paused',
      totalCards: 0,
      activeCards: 0,
      spendLimit: 10000,
      monthlyVolume: 0,
      createdAt: '2022-01-01T10:00:00Z',
    },
  ]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700"><CheckCircle className="w-3 h-3" /> Active</span>;
      case 'paused':
        return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700"><Pause className="w-3 h-3" /> Paused</span>;
      case 'closed':
        return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700"><XCircle className="w-3 h-3" /> Closed</span>;
      default:
        return null;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(amount);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const filteredPrograms = programs.filter(program => {
    if (searchQuery && !program.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !program.id.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Card Programs</h1>
            <p className="text-gray-500">Configure and manage card issuance programs</p>
          </div>
          <div className="flex gap-3">
            <button className="px-4 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Create Program
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
                <p className="text-sm text-gray-500">Active</p>
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
                <p className="text-sm text-gray-500">Cards Issued</p>
                <p className="text-2xl font-bold">{stats.totalCardsIssued.toLocaleString()}</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-100 rounded-lg">
                <DollarSign className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Monthly Volume</p>
                <p className="text-2xl font-bold">{formatCurrency(stats.monthlyVolume)}</p>
              </div>
            </div>
          </Card>
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

        {/* Programs Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredPrograms.map((program) => (
            <Card key={program.id} className="overflow-hidden">
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-8 rounded flex items-center justify-center ${
                      program.brand === 'visa' ? 'bg-blue-600' : 'bg-orange-500'
                    }`}>
                      <span className="text-white text-xs font-bold uppercase">{program.brand}</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-lg">{program.name}</h3>
                        {getStatusBadge(program.status)}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-gray-500 font-mono">{program.id}</span>
                        <button onClick={() => copyToClipboard(program.id)} className="p-0.5 hover:bg-gray-100 rounded">
                          <Copy className="w-3 h-3 text-gray-400" />
                        </button>
                      </div>
                    </div>
                  </div>
                  <button className="p-1 hover:bg-gray-100 rounded">
                    <MoreVertical className="w-5 h-5 text-gray-400" />
                  </button>
                </div>

                <p className="text-sm text-gray-600 mb-4">{program.description}</p>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                      <CreditCard className="w-4 h-4" />
                      Cards
                    </div>
                    <p className="font-semibold">{program.activeCards.toLocaleString()} <span className="text-gray-400 font-normal">/ {program.totalCards.toLocaleString()}</span></p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                      <DollarSign className="w-4 h-4" />
                      Monthly Volume
                    </div>
                    <p className="font-semibold">{formatCurrency(program.monthlyVolume)}</p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 mb-4">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                    program.type === 'virtual' ? 'bg-blue-100 text-blue-700' :
                    program.type === 'physical' ? 'bg-purple-100 text-purple-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {program.type === 'both' ? 'Virtual + Physical' : program.type.charAt(0).toUpperCase() + program.type.slice(1)}
                  </span>
                  {program.currency.map(curr => (
                    <span key={curr} className="px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">
                      {curr}
                    </span>
                  ))}
                  <span className="px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">
                    Limit: {formatCurrency(program.spendLimit)}
                  </span>
                </div>

                <div className="flex items-center gap-2 pt-4 border-t border-gray-100">
                  <button className="flex-1 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg flex items-center justify-center gap-2">
                    <Eye className="w-4 h-4" />
                    View
                  </button>
                  <button className="flex-1 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg flex items-center justify-center gap-2">
                    <Edit2 className="w-4 h-4" />
                    Edit
                  </button>
                  <button className="flex-1 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg flex items-center justify-center gap-2">
                    <Settings className="w-4 h-4" />
                    Settings
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </AdminLayout>
  );
}
