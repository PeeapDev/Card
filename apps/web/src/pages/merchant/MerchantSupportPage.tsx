import { useState } from 'react';
import { MessageSquare, Send, Plus, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { MerchantLayout } from '@/components/layout/MerchantLayout';
import { Card, CardHeader, CardTitle, Button } from '@/components/ui';

interface Ticket {
  id: string;
  subject: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  createdAt: string;
  lastReply: string;
}

const mockTickets: Ticket[] = [
  { id: 'TKT-M001', subject: 'Settlement delay question', status: 'resolved', createdAt: '2024-01-10', lastReply: '2024-01-11' },
  { id: 'TKT-M002', subject: 'API integration help needed', status: 'in_progress', createdAt: '2024-01-14', lastReply: '2024-01-14' },
];

const statusColors = {
  open: 'bg-yellow-100 text-yellow-800',
  in_progress: 'bg-blue-100 text-blue-800',
  resolved: 'bg-green-100 text-green-800',
  closed: 'bg-gray-100 text-gray-800',
};

const statusIcons = {
  open: AlertCircle,
  in_progress: Clock,
  resolved: CheckCircle,
  closed: MessageSquare,
};

export function MerchantSupportPage() {
  const [tickets] = useState<Ticket[]>(mockTickets);
  const [showNewTicket, setShowNewTicket] = useState(false);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle ticket creation
    setShowNewTicket(false);
    setSubject('');
    setMessage('');
  };

  return (
    <MerchantLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Support</h1>
            <p className="text-gray-500 mt-1">Get help with your merchant account</p>
          </div>
          <Button onClick={() => setShowNewTicket(true)}>
            <Plus className="w-4 h-4 mr-2" />
            New Ticket
          </Button>
        </div>

        {showNewTicket && (
          <Card>
            <CardHeader>
              <CardTitle>Create Support Ticket</CardTitle>
            </CardHeader>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Brief description of your issue"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500">
                  <option>Payments & Transactions</option>
                  <option>Settlements & Payouts</option>
                  <option>API & Integration</option>
                  <option>Account Settings</option>
                  <option>Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={5}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Describe your issue in detail..."
                />
              </div>
              <div className="flex gap-3">
                <Button type="button" variant="outline" onClick={() => setShowNewTicket(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={!subject.trim() || !message.trim()}>
                  <Send className="w-4 h-4 mr-2" />
                  Submit Ticket
                </Button>
              </div>
            </form>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Your Tickets</CardTitle>
          </CardHeader>

          {tickets.length === 0 ? (
            <div className="p-8 text-center">
              <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No support tickets yet</p>
              <Button className="mt-4" onClick={() => setShowNewTicket(true)}>
                Create Your First Ticket
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {tickets.map((ticket) => {
                const StatusIcon = statusIcons[ticket.status];
                return (
                  <div key={ticket.id} className="p-4 hover:bg-gray-50 cursor-pointer">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-lg ${statusColors[ticket.status].replace('text-', 'bg-').replace('800', '100')}`}>
                          <StatusIcon className={`w-5 h-5 ${statusColors[ticket.status].split(' ')[1]}`} />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{ticket.subject}</p>
                          <p className="text-sm text-gray-500">{ticket.id}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColors[ticket.status]}`}>
                          {ticket.status.replace('_', ' ')}
                        </span>
                        <p className="text-xs text-gray-400 mt-1">Last reply: {ticket.lastReply}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        <Card className="p-6">
          <h3 className="font-medium text-gray-900 mb-4">Need immediate help?</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="font-medium text-gray-900">Email</p>
              <p className="text-gray-500">merchant-support@peeap.com</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="font-medium text-gray-900">Phone</p>
              <p className="text-gray-500">+232 76 000000</p>
            </div>
          </div>
        </Card>
      </div>
    </MerchantLayout>
  );
}
