import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Calculator,
  ArrowLeft,
  Plus,
  Search,
  Filter,
  Download,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  PieChart,
  BarChart3
} from 'lucide-react';

interface Transaction {
  id: string;
  description: string;
  category: string;
  type: 'income' | 'expense';
  amount: number;
  date: string;
  reference: string;
  status: 'completed' | 'pending';
}

interface CategorySummary {
  name: string;
  amount: number;
  percentage: number;
  color: string;
}

export function SchoolAccountingPage() {
  const [activeTab, setActiveTab] = useState<'all' | 'income' | 'expenses'>('all');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dateRange, setDateRange] = useState('this_month');
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    // TODO: Fetch from API
    setTransactions([
      {
        id: '1',
        description: 'Tuition Fee Collection - January',
        category: 'Tuition Fees',
        type: 'income',
        amount: 425000000,
        date: '2024-01-31',
        reference: 'INC-2024-001',
        status: 'completed',
      },
      {
        id: '2',
        description: 'Teacher Salaries - January',
        category: 'Salaries',
        type: 'expense',
        amount: 85000000,
        date: '2024-01-31',
        reference: 'EXP-2024-001',
        status: 'completed',
      },
      {
        id: '3',
        description: 'Electricity Bill - January',
        category: 'Utilities',
        type: 'expense',
        amount: 5500000,
        date: '2024-01-28',
        reference: 'EXP-2024-002',
        status: 'completed',
      },
      {
        id: '4',
        description: 'Library Fee Collection',
        category: 'Fees',
        type: 'income',
        amount: 31250000,
        date: '2024-01-25',
        reference: 'INC-2024-002',
        status: 'completed',
      },
      {
        id: '5',
        description: 'Textbook Purchase',
        category: 'Educational Materials',
        type: 'expense',
        amount: 15000000,
        date: '2024-01-20',
        reference: 'EXP-2024-003',
        status: 'completed',
      },
      {
        id: '6',
        description: 'Cafeteria Revenue',
        category: 'Cafeteria',
        type: 'income',
        amount: 8500000,
        date: '2024-01-31',
        reference: 'INC-2024-003',
        status: 'completed',
      },
      {
        id: '7',
        description: 'Building Maintenance',
        category: 'Maintenance',
        type: 'expense',
        amount: 3500000,
        date: '2024-01-15',
        reference: 'EXP-2024-004',
        status: 'completed',
      },
      {
        id: '8',
        description: 'Government Grant',
        category: 'Grants',
        type: 'income',
        amount: 50000000,
        date: '2024-01-10',
        reference: 'INC-2024-004',
        status: 'pending',
      },
    ]);
    setLoading(false);
  }, []);

  const totalIncome = transactions
    .filter(t => t.type === 'income' && t.status === 'completed')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpenses = transactions
    .filter(t => t.type === 'expense' && t.status === 'completed')
    .reduce((sum, t) => sum + t.amount, 0);

  const netBalance = totalIncome - totalExpenses;

  const incomeCategories: CategorySummary[] = [
    { name: 'Tuition Fees', amount: 425000000, percentage: 82, color: 'bg-blue-500' },
    { name: 'Fees', amount: 31250000, percentage: 6, color: 'bg-green-500' },
    { name: 'Cafeteria', amount: 8500000, percentage: 2, color: 'bg-yellow-500' },
    { name: 'Grants', amount: 50000000, percentage: 10, color: 'bg-purple-500' },
  ];

  const expenseCategories: CategorySummary[] = [
    { name: 'Salaries', amount: 85000000, percentage: 78, color: 'bg-red-500' },
    { name: 'Educational Materials', amount: 15000000, percentage: 14, color: 'bg-orange-500' },
    { name: 'Utilities', amount: 5500000, percentage: 5, color: 'bg-yellow-500' },
    { name: 'Maintenance', amount: 3500000, percentage: 3, color: 'bg-gray-500' },
  ];

  const filteredTransactions = transactions.filter((txn) => {
    const matchesSearch = txn.description.toLowerCase().includes(search.toLowerCase()) ||
      txn.category.toLowerCase().includes(search.toLowerCase());
    const matchesTab = activeTab === 'all' || txn.type === activeTab.replace('expenses', 'expense');
    return matchesSearch && matchesTab;
  });

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to="/school" className="text-gray-500 hover:text-gray-700 dark:text-gray-400">
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-100 dark:bg-emerald-900 rounded-lg">
                  <Calculator className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900 dark:text-white">Accounting</h1>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Income & Expenses Management
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button className="flex items-center gap-2 px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">
                <Download className="h-4 w-4" />
                Export
              </button>
              <button
                onClick={() => setShowAddModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Plus className="h-4 w-4" />
                Add Entry
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Total Income</p>
                <p className="text-2xl font-bold text-green-600 mt-1">
                  SLE {(totalIncome / 100).toLocaleString()}
                </p>
              </div>
              <div className="p-3 bg-green-100 dark:bg-green-900 rounded-lg">
                <TrendingUp className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
            <p className="text-sm text-green-600 mt-2 flex items-center gap-1">
              <ArrowUpRight className="h-4 w-4" />
              +12.5% from last month
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Total Expenses</p>
                <p className="text-2xl font-bold text-red-600 mt-1">
                  SLE {(totalExpenses / 100).toLocaleString()}
                </p>
              </div>
              <div className="p-3 bg-red-100 dark:bg-red-900 rounded-lg">
                <TrendingDown className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
            </div>
            <p className="text-sm text-red-600 mt-2 flex items-center gap-1">
              <ArrowDownRight className="h-4 w-4" />
              -5.2% from last month
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Net Balance</p>
                <p className={`text-2xl font-bold mt-1 ${netBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  SLE {(netBalance / 100).toLocaleString()}
                </p>
              </div>
              <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <BarChart3 className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
            <p className="text-sm text-gray-500 mt-2">
              This month's balance
            </p>
          </div>
        </div>

        {/* Category Breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Income Categories */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <PieChart className="h-5 w-5 text-green-600" />
              Income Breakdown
            </h3>
            <div className="space-y-3">
              {incomeCategories.map((cat) => (
                <div key={cat.name}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600 dark:text-gray-400">{cat.name}</span>
                    <span className="text-gray-900 dark:text-white font-medium">
                      SLE {(cat.amount / 100).toLocaleString()}
                    </span>
                  </div>
                  <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${cat.color} rounded-full`}
                      style={{ width: `${cat.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Expense Categories */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <PieChart className="h-5 w-5 text-red-600" />
              Expense Breakdown
            </h3>
            <div className="space-y-3">
              {expenseCategories.map((cat) => (
                <div key={cat.name}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600 dark:text-gray-400">{cat.name}</span>
                    <span className="text-gray-900 dark:text-white font-medium">
                      SLE {(cat.amount / 100).toLocaleString()}
                    </span>
                  </div>
                  <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${cat.color} rounded-full`}
                      style={{ width: `${cat.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-6">
          {['all', 'income', 'expenses'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`px-4 py-2 rounded-lg font-medium capitalize ${
                activeTab === tab
                  ? 'bg-blue-600 text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300'
              }`}
            >
              {tab === 'all' ? 'All Transactions' : tab}
            </button>
          ))}
        </div>

        {/* Search & Filter */}
        <div className="flex gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search transactions..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            />
          </div>
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          >
            <option value="today">Today</option>
            <option value="this_week">This Week</option>
            <option value="this_month">This Month</option>
            <option value="this_year">This Year</option>
            <option value="custom">Custom Range</option>
          </select>
        </div>

        {/* Transactions Table */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Transaction
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Reference
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredTransactions.map((txn) => (
                <tr key={txn.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-full ${
                        txn.type === 'income'
                          ? 'bg-green-100 dark:bg-green-900/30'
                          : 'bg-red-100 dark:bg-red-900/30'
                      }`}>
                        {txn.type === 'income' ? (
                          <ArrowDownRight className="h-4 w-4 text-green-600 dark:text-green-400" />
                        ) : (
                          <ArrowUpRight className="h-4 w-4 text-red-600 dark:text-red-400" />
                        )}
                      </div>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {txn.description}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded">
                      {txn.category}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">
                    {txn.reference}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`font-medium ${
                      txn.type === 'income'
                        ? 'text-green-600 dark:text-green-400'
                        : 'text-red-600 dark:text-red-400'
                    }`}>
                      {txn.type === 'income' ? '+' : '-'}SLE {(txn.amount / 100).toLocaleString()}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(txn.date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {txn.status === 'completed' ? (
                      <span className="px-2 py-1 text-xs font-medium text-green-700 bg-green-100 dark:text-green-400 dark:bg-green-900/30 rounded-full">
                        Completed
                      </span>
                    ) : (
                      <span className="px-2 py-1 text-xs font-medium text-yellow-700 bg-yellow-100 dark:text-yellow-400 dark:bg-yellow-900/30 rounded-full">
                        Pending
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
