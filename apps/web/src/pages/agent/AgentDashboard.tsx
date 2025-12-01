import { useState, useEffect } from 'react';
import {
  Users,
  Search,
  MessageSquare,
  Clock,
  CheckCircle,
  AlertTriangle,
  PhoneCall,
  Mail,
  FileText,
  UserCheck,
  Shield,
  CreditCard,
  RefreshCw,
  Zap,
  Send,
  ArrowDownLeft,
  ArrowUpRight,
  Wallet,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { AgentLayout } from '@/components/layout/AgentLayout';
import { supabase } from '@/lib/supabase';
import { AgentPlusUpgradeModal } from '@/components/agent/AgentPlusUpgradeModal';

interface Ticket {
  id: string;
  customer: string;
  issue: string;
  priority: 'high' | 'medium' | 'low';
  status: 'open' | 'in_progress' | 'resolved';
  time: string;
}

export function AgentDashboard() {
  const [stats, setStats] = useState({
    openTickets: 0,
    resolvedToday: 0,
    avgResponseTime: '-',
    satisfactionRate: 0,
  });

  const [recentTickets, setRecentTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [agentTier, setAgentTier] = useState<'basic' | 'standard' | 'agent_plus'>('basic');
  const [walletBalance, setWalletBalance] = useState(0);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // Fetch open disputes as tickets
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data: disputes, error } = await supabase
        .from('disputes')
        .select('*, user:users(first_name, last_name)')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) {
        console.error('Error fetching disputes:', error);
        // Continue with empty data instead of throwing
      }

      // Transform disputes to tickets
      const tickets: Ticket[] = (disputes || []).map(dispute => {
        const userName = dispute.user
          ? `${dispute.user.first_name} ${dispute.user.last_name}`
          : 'Unknown';

        return {
          id: `TKT-${(dispute.id || '').slice(0, 6).toUpperCase()}`,
          customer: userName,
          issue: dispute.reason || 'Dispute',
          priority: (dispute.amount || 0) > 1000 ? 'high' : (dispute.amount || 0) > 100 ? 'medium' : 'low',
          status: dispute.status === 'resolved' ? 'resolved' :
                  dispute.status === 'investigating' ? 'in_progress' : 'open',
          time: formatTimeAgo(dispute.created_at),
        };
      });

      setRecentTickets(tickets);

      // Calculate stats
      const open = tickets.filter(t => t.status === 'open').length;
      const resolved = tickets.filter(t => t.status === 'resolved').length;

      setStats({
        openTickets: open,
        resolvedToday: resolved,
        avgResponseTime: '-',
        satisfactionRate: 0,
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTimeAgo = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  };

  return (
    <AgentLayout>
      <div className="space-y-6">
        {/* Agent+ Upgrade Banner */}
        {agentTier !== 'agent_plus' && (
          <div className="bg-gradient-to-r from-orange-600 to-orange-500 rounded-xl p-4 text-white flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <Zap className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-semibold">Upgrade to Agent+</h3>
                <p className="text-sm text-orange-100">
                  Unlock unlimited transactions, batch payments, staff management & more
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowUpgradeModal(true)}
              className="px-4 py-2 bg-white text-orange-600 rounded-lg font-medium hover:bg-orange-50 transition-colors flex items-center gap-2"
            >
              <Zap className="w-4 h-4" />
              Upgrade Now
            </button>
          </div>
        )}

        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Agent Dashboard</h1>
            <p className="text-gray-500">
              {agentTier === 'agent_plus' ? 'Agent+ Account' : 'Basic Agent Account'}
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={fetchDashboardData}
              className="px-4 py-2 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button className="px-4 py-2 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2">
              <PhoneCall className="w-4 h-4" />
              Call Queue
            </button>
            <button className="px-4 py-2 text-sm bg-orange-600 text-white rounded-lg hover:bg-orange-700 flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              Live Chat
            </button>
          </div>
        </div>

        {/* Wallet & Quick Transfer */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="p-6 bg-gradient-to-br from-orange-500 to-orange-600 text-white">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-white/20 rounded-lg">
                <Wallet className="w-6 h-6" />
              </div>
              <span className="text-xs bg-white/20 px-2 py-1 rounded-full">Agent Wallet</span>
            </div>
            <p className="text-sm text-orange-100">Available Balance</p>
            <p className="text-3xl font-bold">
              ${walletBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </p>
            <div className="flex gap-2 mt-4">
              <button className="flex-1 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-1">
                <ArrowDownLeft className="w-4 h-4" />
                Deposit
              </button>
              <button className="flex-1 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-1">
                <ArrowUpRight className="w-4 h-4" />
                Withdraw
              </button>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Quick Transfer</h3>
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Recipient phone or wallet ID"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              />
              <input
                type="number"
                placeholder="Amount"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              />
              <button className="w-full py-2 bg-orange-600 text-white rounded-lg font-medium hover:bg-orange-700 transition-colors flex items-center justify-center gap-2">
                <Send className="w-4 h-4" />
                Send Money
              </button>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Today's Activity</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <ArrowDownLeft className="w-4 h-4 text-green-600" />
                  </div>
                  <span className="text-sm text-gray-600">Cash In</span>
                </div>
                <span className="font-semibold text-green-600">$0.00</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-red-100 rounded-lg">
                    <ArrowUpRight className="w-4 h-4 text-red-600" />
                  </div>
                  <span className="text-sm text-gray-600">Cash Out</span>
                </div>
                <span className="font-semibold text-red-600">$0.00</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Send className="w-4 h-4 text-blue-600" />
                  </div>
                  <span className="text-sm text-gray-600">Transfers</span>
                </div>
                <span className="font-semibold text-blue-600">0</span>
              </div>
            </div>
          </Card>
        </div>

        {/* Search Bar */}
        <Card className="p-4">
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search customers by email, phone, or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              />
            </div>
            <button className="px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700">
              Search
            </button>
          </div>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-red-100 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Open Tickets</p>
                <p className="text-2xl font-bold text-red-600">{stats.openTickets}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-green-100 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Resolved Today</p>
                <p className="text-2xl font-bold text-green-600">{stats.resolvedToday}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Clock className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Avg Response</p>
                <p className="text-2xl font-bold text-blue-600">{stats.avgResponseTime}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-purple-100 rounded-lg">
                <UserCheck className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Satisfaction</p>
                <p className="text-2xl font-bold text-purple-600">{stats.satisfactionRate}%</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Tickets & Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2 p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Recent Tickets</h2>
              <select className="text-sm border border-gray-300 rounded-lg px-3 py-1.5">
                <option>All Tickets</option>
                <option>Open</option>
                <option>In Progress</option>
                <option>Resolved</option>
              </select>
            </div>
            <div className="space-y-3">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
                </div>
              ) : recentTickets.length === 0 ? (
                <div className="text-center py-8">
                  <AlertTriangle className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-gray-500">No tickets found</p>
                </div>
              ) : (
                recentTickets.map((ticket) => (
                  <div key={ticket.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors">
                    <div className="flex items-center gap-4">
                      <div className={`w-2 h-2 rounded-full ${
                        ticket.priority === 'high' ? 'bg-red-500' :
                        ticket.priority === 'medium' ? 'bg-yellow-500' : 'bg-gray-400'
                      }`} />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{ticket.id}</span>
                          <span className={`px-2 py-0.5 text-xs rounded-full ${
                            ticket.status === 'open' ? 'bg-red-100 text-red-700' :
                            ticket.status === 'in_progress' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-green-100 text-green-700'
                          }`}>
                            {ticket.status.replace('_', ' ')}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600">{ticket.customer} - {ticket.issue}</p>
                      </div>
                    </div>
                    <span className="text-xs text-gray-500">{ticket.time}</span>
                  </div>
                ))
              )}
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
            <div className="space-y-3">
              <button className="w-full p-4 bg-gray-50 hover:bg-gray-100 rounded-lg text-left transition-colors flex items-center gap-3">
                <Users className="w-5 h-5 text-gray-600" />
                <div>
                  <p className="font-medium text-sm">Lookup Customer</p>
                  <p className="text-xs text-gray-500">Find customer details</p>
                </div>
              </button>
              <button className="w-full p-4 bg-gray-50 hover:bg-gray-100 rounded-lg text-left transition-colors flex items-center gap-3">
                <CreditCard className="w-5 h-5 text-gray-600" />
                <div>
                  <p className="font-medium text-sm">Card Actions</p>
                  <p className="text-xs text-gray-500">Block/unblock cards</p>
                </div>
              </button>
              <button className="w-full p-4 bg-gray-50 hover:bg-gray-100 rounded-lg text-left transition-colors flex items-center gap-3">
                <Shield className="w-5 h-5 text-gray-600" />
                <div>
                  <p className="font-medium text-sm">KYC Review</p>
                  <p className="text-xs text-gray-500">Verify documents</p>
                </div>
              </button>
              <button className="w-full p-4 bg-gray-50 hover:bg-gray-100 rounded-lg text-left transition-colors flex items-center gap-3">
                <Mail className="w-5 h-5 text-gray-600" />
                <div>
                  <p className="font-medium text-sm">Send Notification</p>
                  <p className="text-xs text-gray-500">Email or SMS</p>
                </div>
              </button>
              <button className="w-full p-4 bg-gray-50 hover:bg-gray-100 rounded-lg text-left transition-colors flex items-center gap-3">
                <FileText className="w-5 h-5 text-gray-600" />
                <div>
                  <p className="font-medium text-sm">Create Report</p>
                  <p className="text-xs text-gray-500">Document issues</p>
                </div>
              </button>
            </div>
          </Card>
        </div>
      </div>

      {/* Agent+ Upgrade Modal */}
      <AgentPlusUpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        onUpgrade={async () => {
          // Handle upgrade logic
          setAgentTier('agent_plus');
          setShowUpgradeModal(false);
        }}
        currentTier={agentTier}
      />
    </AgentLayout>
  );
}
