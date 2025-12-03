import { useState, useEffect } from 'react';
import {
  Headphones,
  Search,
  Plus,
  Eye,
  Edit,
  Ban,
  CheckCircle,
  Clock,
  Download,
  Mail,
  Phone,
  MessageSquare,
  Ticket,
  Star,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { supabase } from '@/lib/supabase';

interface Agent {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
  status: string; // Database uses 'ACTIVE', 'INACTIVE', etc.
  created_at: string;
  tickets_resolved?: number;
  avg_rating?: number;
  online_status?: 'online' | 'offline' | 'busy';
}

export function AgentsManagementPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    fetchAgents();
  }, []);

  const fetchAgents = async () => {
    setLoading(true);
    try {
      // Database uses 'roles' column (plural), may contain comma-separated values
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .ilike('roles', '%agent%')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching agents:', error);
        setAgents([]);
        return;
      }
      setAgents(data || []);
    } catch (error) {
      console.error('Error fetching agents:', error);
      setAgents([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredAgents = agents.filter(agent => {
    const matchesSearch =
      agent.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      `${agent.first_name} ${agent.last_name}`.toLowerCase().includes(searchTerm.toLowerCase());

    const isActive = agent.status === 'ACTIVE';
    const matchesStatus = statusFilter === 'all' ||
      (statusFilter === 'active' && isActive) ||
      (statusFilter === 'inactive' && !isActive) ||
      (statusFilter === 'online' && agent.online_status === 'online');

    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (onlineStatus?: string, dbStatus?: string) => {
    const isActive = dbStatus === 'ACTIVE';
    if (!isActive) {
      return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">Inactive</span>;
    }
    switch (onlineStatus) {
      case 'online':
        return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700"><span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" /> Online</span>;
      case 'busy':
        return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700"><span className="w-2 h-2 bg-yellow-500 rounded-full" /> Busy</span>;
      default:
        return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-600"><span className="w-2 h-2 bg-green-400 rounded-full" /> Active</span>;
    }
  };

  const toggleAgentStatus = async (agentId: string, currentStatus: boolean) => {
    try {
      // Database uses 'status' column ('ACTIVE' or 'INACTIVE'), not 'is_active'
      const newStatus = currentStatus ? 'INACTIVE' : 'ACTIVE';
      const { error } = await supabase
        .from('users')
        .update({ status: newStatus })
        .eq('id', agentId);

      if (error) {
        console.error('Error updating agent status:', error);
        return;
      }
      fetchAgents();
    } catch (error) {
      console.error('Error updating agent status:', error);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Agent Management</h1>
            <p className="text-gray-500">Manage support agent accounts and performance</p>
          </div>
          <button className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Add Agent
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Headphones className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Agents</p>
                <p className="text-xl font-semibold">{agents.length}</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Online</p>
                <p className="text-xl font-semibold">{agents.filter(a => a.status === 'online').length}</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Ticket className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Tickets Resolved</p>
                <p className="text-xl font-semibold">{agents.reduce((sum, a) => sum + (a.tickets_resolved || 0), 0)}</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Star className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Avg Rating</p>
                <p className="text-xl font-semibold">
                  {agents.length > 0
                    ? (agents.reduce((sum, a) => sum + (a.avg_rating || 0), 0) / agents.length).toFixed(1)
                    : '0.0'}
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Filters */}
        <Card className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search agents by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="online">Online</option>
            </select>
            <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2">
              <Download className="w-4 h-4" />
              Export
            </button>
          </div>
        </Card>

        {/* Agents Table */}
        <Card className="overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
              <p className="mt-2 text-gray-500">Loading agents...</p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Agent</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contact</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Performance</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Joined</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredAgents.map((agent) => (
                  <tr key={agent.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                          <Headphones className="w-5 h-5 text-orange-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{agent.first_name} {agent.last_name}</p>
                          <p className="text-sm text-gray-500">ID: {agent.id.slice(0, 8)}...</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <p className="text-sm flex items-center gap-1">
                          <Mail className="w-3 h-3 text-gray-400" />
                          {agent.email}
                        </p>
                        {agent.phone && (
                          <p className="text-sm flex items-center gap-1">
                            <Phone className="w-3 h-3 text-gray-400" />
                            {agent.phone}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(agent.online_status, agent.status)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <p className="text-sm flex items-center gap-1">
                          <Ticket className="w-3 h-3 text-gray-400" />
                          {agent.tickets_resolved || 0} resolved
                        </p>
                        <p className="text-sm flex items-center gap-1">
                          <Star className="w-3 h-3 text-yellow-500" />
                          {agent.avg_rating?.toFixed(1) || '0.0'} rating
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-gray-500">
                        {new Date(agent.created_at).toLocaleDateString()}
                      </p>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button className="p-2 hover:bg-gray-100 rounded-lg" title="View">
                          <Eye className="w-4 h-4 text-gray-500" />
                        </button>
                        <button className="p-2 hover:bg-gray-100 rounded-lg" title="Edit">
                          <Edit className="w-4 h-4 text-gray-500" />
                        </button>
                        <button className="p-2 hover:bg-gray-100 rounded-lg" title="Chat">
                          <MessageSquare className="w-4 h-4 text-gray-500" />
                        </button>
                        <button
                          onClick={() => toggleAgentStatus(agent.id, agent.status === 'ACTIVE')}
                          className={`p-2 hover:bg-gray-100 rounded-lg ${agent.status === 'ACTIVE' ? 'text-red-500' : 'text-green-500'}`}
                          title={agent.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                        >
                          {agent.status === 'ACTIVE' ? <Ban className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {!loading && filteredAgents.length === 0 && (
            <div className="p-8 text-center">
              <Headphones className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No agents found</p>
            </div>
          )}
        </Card>
      </div>
    </AdminLayout>
  );
}
