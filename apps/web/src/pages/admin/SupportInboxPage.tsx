/**
 * Support Inbox Page
 *
 * Admin/Support staff view for managing all support conversations.
 * Features:
 * - View all support conversations
 * - AI-flagged message alerts
 * - Assign to staff
 * - Canned responses
 * - Priority management
 */

import { useState, useEffect } from 'react';
import {
  MessageSquare,
  Flag,
  AlertTriangle,
  Users,
  Clock,
  Filter,
  Settings,
  RefreshCw,
  X,
  CheckCircle,
  XCircle,
  Eye,
  Trash2,
  ChevronDown,
  Zap,
  Plus,
  Search,
} from 'lucide-react';
import { ConversationList, ChatThread } from '@/components/chat';
import {
  conversationService,
  Conversation,
  FlaggedMessage,
  CannedResponse,
  AIFlagKeyword,
} from '@/services/conversation.service';

type TabType = 'inbox' | 'flagged' | 'canned' | 'keywords';

export default function SupportInboxPage() {
  const [activeTab, setActiveTab] = useState<TabType>('inbox');
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [flaggedMessages, setFlaggedMessages] = useState<FlaggedMessage[]>([]);
  const [cannedResponses, setCannedResponses] = useState<CannedResponse[]>([]);
  const [aiKeywords, setAIKeywords] = useState<AIFlagKeyword[]>([]);
  const [stats, setStats] = useState({ total: 0, open: 0, flagged: 0, avgResponseTime: 0, byDepartment: {} });
  const [loading, setLoading] = useState(true);

  // Modal states
  const [showNewCanned, setShowNewCanned] = useState(false);
  const [showNewKeyword, setShowNewKeyword] = useState(false);
  const [newCanned, setNewCanned] = useState({ title: '', content: '', shortcut: '', category: '' });
  const [newKeyword, setNewKeyword] = useState({ keyword: '', category: 'suspicious', severity: 'medium' as const, action: 'flag' as const });

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    setLoading(true);

    if (activeTab === 'inbox') {
      const statsResult = await conversationService.getSupportStats();
      setStats(statsResult);
    } else if (activeTab === 'flagged') {
      const flagged = await conversationService.getFlaggedMessages({ status: 'pending' });
      setFlaggedMessages(flagged);
    } else if (activeTab === 'canned') {
      const responses = await conversationService.getCannedResponses();
      setCannedResponses(responses);
    } else if (activeTab === 'keywords') {
      const keywords = await conversationService.getAIKeywords();
      setAIKeywords(keywords);
    }

    setLoading(false);
  };

  const handleReviewFlag = async (flagId: string, action: 'dismissed' | 'action_taken', notes?: string) => {
    await conversationService.reviewFlaggedMessage(flagId, {
      status: action,
      notes,
      action: action === 'action_taken' ? 'warning_sent' : 'none',
    });
    loadData();
  };

  const handleCreateCanned = async () => {
    if (!newCanned.title || !newCanned.content) return;
    await conversationService.createCannedResponse({
      title: newCanned.title,
      content: newCanned.content,
      shortcut: newCanned.shortcut || undefined,
      category: newCanned.category || undefined,
    });
    setShowNewCanned(false);
    setNewCanned({ title: '', content: '', shortcut: '', category: '' });
    loadData();
  };

  const handleAddKeyword = async () => {
    if (!newKeyword.keyword) return;
    await conversationService.addAIKeyword(newKeyword);
    setShowNewKeyword(false);
    setNewKeyword({ keyword: '', category: 'suspicious', severity: 'medium', action: 'flag' });
    loadData();
  };

  const handleToggleKeyword = async (keywordId: string, isActive: boolean) => {
    await conversationService.toggleAIKeyword(keywordId, isActive);
    loadData();
  };

  const handleDeleteKeyword = async (keywordId: string) => {
    if (!confirm('Are you sure you want to delete this keyword?')) return;
    await conversationService.deleteAIKeyword(keywordId);
    loadData();
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      case 'high': return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400';
      case 'medium': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
      default: return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-400';
    }
  };

  return (
    <div className="h-[calc(100vh-4rem)]">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Support Inbox</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Manage support conversations and AI moderation
            </p>
          </div>
          <button
            onClick={loadData}
            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>

        {/* Stats Bar */}
        <div className="flex items-center gap-6 mt-4">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-gray-400" />
            <span className="text-sm text-gray-600 dark:text-gray-400">
              <span className="font-semibold text-gray-900 dark:text-white">{stats.open}</span> open
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Flag className="w-5 h-5 text-red-500" />
            <span className="text-sm text-gray-600 dark:text-gray-400">
              <span className="font-semibold text-red-600">{stats.flagged}</span> flagged
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-gray-400" />
            <span className="text-sm text-gray-600 dark:text-gray-400">
              <span className="font-semibold text-gray-900 dark:text-white">{stats.total}</span> total
            </span>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mt-4 border-b border-gray-200 dark:border-gray-700 -mb-4">
          {[
            { id: 'inbox', label: 'Inbox', icon: MessageSquare },
            { id: 'flagged', label: 'Flagged', icon: Flag, badge: flaggedMessages.length },
            { id: 'canned', label: 'Canned Responses', icon: Zap },
            { id: 'keywords', label: 'AI Keywords', icon: Settings },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors ${
                activeTab === tab.id
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
              {tab.badge && tab.badge > 0 && (
                <span className="px-1.5 py-0.5 text-xs bg-red-500 text-white rounded-full">
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="h-[calc(100%-10rem)]">
        {activeTab === 'inbox' && (
          <div className="flex h-full">
            {/* Conversation List */}
            <div className="w-96 border-r border-gray-200 dark:border-gray-700">
              <ConversationList
                mode="support"
                selectedId={selectedConversation?.id}
                onSelectConversation={setSelectedConversation}
              />
            </div>

            {/* Chat Thread */}
            <div className="flex-1">
              {selectedConversation ? (
                <ChatThread
                  conversation={selectedConversation}
                  userRole="support"
                  showCannedResponses
                  onConversationUpdate={() => {
                    // Refresh conversation
                    conversationService.getConversation(selectedConversation.id)
                      .then(conv => conv && setSelectedConversation(conv));
                  }}
                />
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
                  <div className="text-center">
                    <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Select a conversation to view messages</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'flagged' && (
          <div className="p-6 space-y-4 overflow-y-auto h-full">
            {flaggedMessages.length === 0 ? (
              <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                <CheckCircle className="w-12 h-12 mx-auto mb-4 text-green-500 opacity-50" />
                <p>No flagged messages to review</p>
              </div>
            ) : (
              flaggedMessages.map(flag => (
                <div key={flag.id} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getSeverityColor(flag.severity)}`}>
                        {flag.severity.toUpperCase()}
                      </span>
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {new Date(flag.created_at).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleReviewFlag(flag.id, 'dismissed')}
                        className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg"
                        title="Dismiss"
                      >
                        <CheckCircle className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => {
                          const notes = prompt('Action notes:');
                          if (notes !== null) handleReviewFlag(flag.id, 'action_taken', notes);
                        }}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                        title="Take Action"
                      >
                        <AlertTriangle className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 mb-3">
                    <p className="text-sm text-gray-900 dark:text-white">
                      {flag.message?.content}
                    </p>
                    <p className="text-xs text-gray-500 mt-2">
                      From: {flag.message?.sender_name || flag.message?.sender_type}
                    </p>
                  </div>

                  <div className="text-sm text-red-600 dark:text-red-400">
                    <strong>Matched:</strong> {flag.matched_keywords?.join(', ')}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'canned' && (
          <div className="p-6 space-y-4 overflow-y-auto h-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900 dark:text-white">Canned Responses</h3>
              <button
                onClick={() => setShowNewCanned(true)}
                className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
              >
                <Plus className="w-4 h-4" />
                Add Response
              </button>
            </div>

            {/* New Canned Response Modal */}
            {showNewCanned && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-gray-900 dark:text-white">New Canned Response</h3>
                    <button onClick={() => setShowNewCanned(false)} className="text-gray-400 hover:text-gray-600">
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="space-y-4">
                    <input
                      type="text"
                      placeholder="Title"
                      value={newCanned.title}
                      onChange={(e) => setNewCanned({ ...newCanned, title: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                    <textarea
                      placeholder="Response content..."
                      value={newCanned.content}
                      onChange={(e) => setNewCanned({ ...newCanned, content: e.target.value })}
                      rows={4}
                      className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <input
                        type="text"
                        placeholder="Shortcut (e.g., /refund)"
                        value={newCanned.shortcut}
                        onChange={(e) => setNewCanned({ ...newCanned, shortcut: e.target.value })}
                        className="px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                      <input
                        type="text"
                        placeholder="Category"
                        value={newCanned.category}
                        onChange={(e) => setNewCanned({ ...newCanned, category: e.target.value })}
                        className="px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    </div>
                    <button
                      onClick={handleCreateCanned}
                      className="w-full py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                    >
                      Create Response
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="grid gap-4">
              {cannedResponses.map(response => (
                <div key={response.id} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-white">{response.title}</h4>
                      {response.shortcut && (
                        <span className="text-xs text-primary-600 dark:text-primary-400">{response.shortcut}</span>
                      )}
                    </div>
                    {response.category && (
                      <span className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded">
                        {response.category}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{response.content}</p>
                  <p className="text-xs text-gray-400 mt-2">Used {response.use_count} times</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'keywords' && (
          <div className="p-6 space-y-4 overflow-y-auto h-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900 dark:text-white">AI Flag Keywords</h3>
              <button
                onClick={() => setShowNewKeyword(true)}
                className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
              >
                <Plus className="w-4 h-4" />
                Add Keyword
              </button>
            </div>

            {/* New Keyword Modal */}
            {showNewKeyword && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-gray-900 dark:text-white">Add Flag Keyword</h3>
                    <button onClick={() => setShowNewKeyword(false)} className="text-gray-400 hover:text-gray-600">
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="space-y-4">
                    <input
                      type="text"
                      placeholder="Keyword or phrase"
                      value={newKeyword.keyword}
                      onChange={(e) => setNewKeyword({ ...newKeyword, keyword: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                    <div className="grid grid-cols-3 gap-4">
                      <select
                        value={newKeyword.category}
                        onChange={(e) => setNewKeyword({ ...newKeyword, category: e.target.value })}
                        className="px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      >
                        <option value="fraud">Fraud</option>
                        <option value="scam">Scam</option>
                        <option value="suspicious">Suspicious</option>
                        <option value="harassment">Harassment</option>
                        <option value="prohibited">Prohibited</option>
                        <option value="spam">Spam</option>
                      </select>
                      <select
                        value={newKeyword.severity}
                        onChange={(e) => setNewKeyword({ ...newKeyword, severity: e.target.value as any })}
                        className="px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                        <option value="critical">Critical</option>
                      </select>
                      <select
                        value={newKeyword.action}
                        onChange={(e) => setNewKeyword({ ...newKeyword, action: e.target.value as any })}
                        className="px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      >
                        <option value="flag">Flag</option>
                        <option value="notify_admin">Notify Admin</option>
                        <option value="block">Block</option>
                        <option value="auto_delete">Auto Delete</option>
                      </select>
                    </div>
                    <button
                      onClick={handleAddKeyword}
                      className="w-full py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                    >
                      Add Keyword
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Keyword</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Category</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Severity</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Action</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {aiKeywords.map(keyword => (
                    <tr key={keyword.id} className={!keyword.is_active ? 'opacity-50' : ''}>
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-white font-medium">
                        {keyword.keyword}
                        {keyword.is_regex && (
                          <span className="ml-2 text-xs text-purple-600">(regex)</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{keyword.category}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 text-xs rounded-full ${getSeverityColor(keyword.severity)}`}>
                          {keyword.severity}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{keyword.action}</td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleToggleKeyword(keyword.id, !keyword.is_active)}
                          className={`px-2 py-1 text-xs rounded-full ${
                            keyword.is_active
                              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                              : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-400'
                          }`}
                        >
                          {keyword.is_active ? 'Active' : 'Inactive'}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => handleDeleteKeyword(keyword.id)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
