/**
 * Event Staff Page
 *
 * Manage staff members who can scan tickets.
 */

import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { MerchantLayout } from '@/components/layout/MerchantLayout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui';
import { Modal } from '@/components/ui/Modal';
import { useAuth } from '@/context/AuthContext';
import eventService, { Event, EventStaff } from '@/services/event.service';
import { supabase } from '@/lib/supabase';
import {
  ArrowLeft,
  Plus,
  Users,
  Mail,
  Phone,
  Trash2,
  Loader2,
  Clock,
  CheckCircle,
  XCircle,
  QrCode,
  Send,
  Search,
} from 'lucide-react';

interface UserSearchResult {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
}

export function EventStaffPage() {
  const navigate = useNavigate();
  const { eventId } = useParams<{ eventId: string }>();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [event, setEvent] = useState<Event | null>(null);
  const [staff, setStaff] = useState<EventStaff[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [inviting, setInviting] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      if (!eventId) return;

      setLoading(true);
      try {
        const [eventData, staffData] = await Promise.all([
          eventService.getEventById(eventId),
          eventService.getEventStaff(eventId),
        ]);
        setEvent(eventData);
        setStaff(staffData);
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [eventId]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setSearching(true);
    try {
      // Search users by email or phone
      const { data, error } = await supabase
        .from('users')
        .select('id, first_name, last_name, email, phone')
        .or(`email.ilike.%${searchQuery}%,phone.ilike.%${searchQuery}%`)
        .limit(10);

      if (error) throw error;

      // Filter out users already added as staff
      const staffUserIds = new Set(staff.map((s) => s.user_id));
      const filtered = (data || []).filter((u) => u.id !== user?.id && !staffUserIds.has(u.id));

      setSearchResults(filtered);
    } catch (error) {
      console.error('Error searching users:', error);
    } finally {
      setSearching(false);
    }
  };

  const handleInvite = async (userId: string) => {
    if (!eventId || !user?.id) return;

    setInviting(true);
    try {
      const newStaff = await eventService.inviteEventStaff(eventId, user.id, userId);
      setStaff([...staff, newStaff]);
      setSearchResults(searchResults.filter((u) => u.id !== userId));
    } catch (error) {
      console.error('Error inviting staff:', error);
      alert('Failed to invite staff member');
    } finally {
      setInviting(false);
    }
  };

  const handleRemove = async (staffId: string) => {
    if (!confirm('Are you sure you want to remove this staff member?')) return;

    try {
      await eventService.deleteEventStaff(staffId);
      setStaff(staff.filter((s) => s.id !== staffId));
    } catch (error) {
      console.error('Error removing staff:', error);
      alert('Failed to remove staff member');
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
      pending: {
        bg: 'bg-yellow-100 dark:bg-yellow-900/30',
        text: 'text-yellow-700 dark:text-yellow-400',
        icon: <Clock className="w-4 h-4" />,
      },
      accepted: {
        bg: 'bg-green-100 dark:bg-green-900/30',
        text: 'text-green-700 dark:text-green-400',
        icon: <CheckCircle className="w-4 h-4" />,
      },
      declined: {
        bg: 'bg-red-100 dark:bg-red-900/30',
        text: 'text-red-700 dark:text-red-400',
        icon: <XCircle className="w-4 h-4" />,
      },
    };
    return styles[status] || styles.pending;
  };

  if (loading) {
    return (
      <MerchantLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
        </div>
      </MerchantLayout>
    );
  }

  return (
    <MerchantLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={() => navigate(`/merchant/events/${eventId}`)}
              className="p-2"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Event Staff</h1>
              <p className="text-gray-600 dark:text-gray-400">{event?.title}</p>
            </div>
          </div>
          <Button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700"
          >
            <Plus className="w-4 h-4" />
            Invite Staff
          </Button>
        </div>

        {/* Staff List */}
        {staff.length === 0 ? (
          <Card className="p-12 text-center">
            <Users className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No staff members yet
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6">
              Invite team members to help scan tickets at your event
            </p>
            <Button
              onClick={() => setShowModal(true)}
              className="bg-purple-600 hover:bg-purple-700"
            >
              Invite Your First Staff Member
            </Button>
          </Card>
        ) : (
          <div className="grid gap-4">
            {staff.map((member) => {
              const userData = (member as any).users;
              const statusStyle = getStatusBadge(member.invitation_status);

              return (
                <Card key={member.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center">
                        <Users className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-gray-900 dark:text-white">
                            {userData?.first_name} {userData?.last_name}
                          </h3>
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full ${statusStyle.bg} ${statusStyle.text}`}
                          >
                            {statusStyle.icon}
                            {member.invitation_status.charAt(0).toUpperCase() +
                              member.invitation_status.slice(1)}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                          {userData?.email && (
                            <span className="flex items-center gap-1">
                              <Mail className="w-4 h-4" />
                              {userData.email}
                            </span>
                          )}
                          {userData?.phone && (
                            <span className="flex items-center gap-1">
                              <Phone className="w-4 h-4" />
                              {userData.phone}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      {member.invitation_status === 'accepted' && (
                        <div className="text-right">
                          <div className="flex items-center gap-2 text-gray-900 dark:text-white">
                            <QrCode className="w-4 h-4 text-gray-400" />
                            <span className="font-medium">{member.scan_count || 0}</span>
                            <span className="text-gray-500">scans</span>
                          </div>
                          {member.last_scan_at && (
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              Last scan:{' '}
                              {new Date(member.last_scan_at).toLocaleString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                hour: 'numeric',
                                minute: '2-digit',
                              })}
                            </p>
                          )}
                        </div>
                      )}

                      <button
                        onClick={() => handleRemove(member.id!)}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-red-500"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {/* Invite Modal */}
        <Modal
          isOpen={showModal}
          onClose={() => {
            setShowModal(false);
            setSearchQuery('');
            setSearchResults([]);
          }}
          title="Invite Staff Member"
        >
          <Modal.Body>
            <div className="space-y-4">
              <p className="text-gray-600 dark:text-gray-400">
                Search for users by email or phone number to invite them as event staff.
              </p>

              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500"
                    placeholder="Search by email or phone..."
                  />
                </div>
                <Button
                  onClick={handleSearch}
                  disabled={searching || !searchQuery.trim()}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Search'}
                </Button>
              </div>

              {/* Search Results */}
              {searchResults.length > 0 && (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {searchResults.map((result) => (
                    <div
                      key={result.id}
                      className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                    >
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {result.first_name} {result.last_name}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {result.email || result.phone}
                        </p>
                      </div>
                      <Button
                        onClick={() => handleInvite(result.id)}
                        disabled={inviting}
                        size="sm"
                        className="bg-purple-600 hover:bg-purple-700"
                      >
                        {inviting ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <Send className="w-4 h-4 mr-1" />
                            Invite
                          </>
                        )}
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {searchQuery && searchResults.length === 0 && !searching && (
                <p className="text-center text-gray-500 dark:text-gray-400 py-4">
                  No users found matching "{searchQuery}"
                </p>
              )}
            </div>
          </Modal.Body>
          <Modal.Footer>
            <Button
              variant="outline"
              onClick={() => {
                setShowModal(false);
                setSearchQuery('');
                setSearchResults([]);
              }}
            >
              Close
            </Button>
          </Modal.Footer>
        </Modal>
      </div>
    </MerchantLayout>
  );
}
