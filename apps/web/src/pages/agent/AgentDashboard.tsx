import { useState } from 'react';
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
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { AgentLayout } from '@/components/layout/AgentLayout';

export function AgentDashboard() {
  const [stats] = useState({
    openTickets: 12,
    resolvedToday: 28,
    avgResponseTime: '4.5 min',
    satisfactionRate: 94,
  });

  const [recentTickets] = useState([
    { id: 'TKT-001', customer: 'John Doe', issue: 'Card blocked unexpectedly', priority: 'high', status: 'open', time: '5 mins ago' },
    { id: 'TKT-002', customer: 'Jane Smith', issue: 'Unable to verify account', priority: 'medium', status: 'in_progress', time: '15 mins ago' },
    { id: 'TKT-003', customer: 'Bob Wilson', issue: 'Transaction dispute', priority: 'high', status: 'open', time: '25 mins ago' },
    { id: 'TKT-004', customer: 'Alice Brown', issue: 'Password reset request', priority: 'low', status: 'open', time: '1 hour ago' },
    { id: 'TKT-005', customer: 'Charlie Davis', issue: 'Wallet balance inquiry', priority: 'low', status: 'resolved', time: '2 hours ago' },
  ]);

  const [searchQuery, setSearchQuery] = useState('');

  return (
    <AgentLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Agent Dashboard</h1>
            <p className="text-gray-500">Customer support center</p>
          </div>
          <div className="flex gap-3">
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
              {recentTickets.map((ticket) => (
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
              ))}
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
    </AgentLayout>
  );
}
