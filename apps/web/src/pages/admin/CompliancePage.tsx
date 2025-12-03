import { useState } from 'react';
import {
  FileCheck,
  Shield,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  Download,
  Upload,
  Calendar,
  User,
  FileText,
  Search,
  Filter,
  ChevronDown,
  AlertCircle,
  TrendingUp,
  Ban,
  Flag,
} from 'lucide-react';
import { Card, MotionCard } from '@/components/ui/Card';
import { AdminLayout } from '@/components/layout/AdminLayout';

interface KYCReview {
  id: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  submittedAt: string;
  status: 'pending' | 'approved' | 'rejected' | 'escalated';
  riskLevel: 'low' | 'medium' | 'high';
  documentType: string;
  assignedTo: string | null;
  notes: string | null;
}

interface ComplianceAlert {
  id: string;
  type: 'aml' | 'pep' | 'sanctions' | 'velocity' | 'fraud';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  customerId: string;
  customerName: string;
  createdAt: string;
  status: 'open' | 'investigating' | 'resolved' | 'dismissed';
}

interface ComplianceReport {
  id: string;
  name: string;
  type: string;
  period: string;
  status: 'pending' | 'generated' | 'submitted';
  dueDate: string;
  submittedAt: string | null;
}

export function CompliancePage() {
  const [activeTab, setActiveTab] = useState<'kyc' | 'aml' | 'reports' | 'sanctions'>('kyc');
  const [kycFilter, setKycFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const [stats] = useState({
    pendingKYC: 0,
    approvedToday: 0,
    rejectedToday: 0,
    openAlerts: 0,
    criticalAlerts: 0,
    pendingReports: 0,
  });

  const [kycReviews] = useState<KYCReview[]>([]);

  const [complianceAlerts] = useState<ComplianceAlert[]>([]);

  const [reports] = useState<ComplianceReport[]>([]);

  const getKYCStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"><CheckCircle className="w-3 h-3" /> Approved</span>;
      case 'rejected':
        return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400"><XCircle className="w-3 h-3" /> Rejected</span>;
      case 'pending':
        return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400"><Clock className="w-3 h-3" /> Pending</span>;
      case 'escalated':
        return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400"><AlertTriangle className="w-3 h-3" /> Escalated</span>;
      default:
        return null;
    }
  };

  const getRiskBadge = (risk: string) => {
    switch (risk) {
      case 'low':
        return <span className="px-2 py-0.5 rounded text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">Low</span>;
      case 'medium':
        return <span className="px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400">Medium</span>;
      case 'high':
        return <span className="px-2 py-0.5 rounded text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400">High</span>;
      default:
        return null;
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'low':
        return <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">Low</span>;
      case 'medium':
        return <span className="px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400">Medium</span>;
      case 'high':
        return <span className="px-2 py-0.5 rounded text-xs font-medium bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400">High</span>;
      case 'critical':
        return <span className="px-2 py-0.5 rounded text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400">Critical</span>;
      default:
        return null;
    }
  };

  const getAlertTypeIcon = (type: string) => {
    switch (type) {
      case 'aml':
        return <Shield className="w-4 h-4 text-purple-600 dark:text-purple-400" />;
      case 'pep':
        return <Flag className="w-4 h-4 text-blue-600 dark:text-blue-400" />;
      case 'sanctions':
        return <Ban className="w-4 h-4 text-red-600 dark:text-red-400" />;
      case 'velocity':
        return <TrendingUp className="w-4 h-4 text-orange-600 dark:text-orange-400" />;
      case 'fraud':
        return <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-600 dark:text-gray-400" />;
    }
  };

  const filteredKYC = kycReviews.filter(review => {
    if (kycFilter !== 'all' && review.status !== kycFilter) return false;
    if (searchQuery && !review.customerName.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !review.customerEmail.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Compliance</h1>
            <p className="text-gray-500 dark:text-gray-400">KYC verifications, AML monitoring, and regulatory reporting</p>
          </div>
          <div className="flex gap-3">
            <button className="px-4 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 flex items-center gap-2">
              <Download className="w-4 h-4" />
              Export
            </button>
            <button className="px-4 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center gap-2">
              <FileCheck className="w-4 h-4" />
              Generate Report
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          <MotionCard className="p-4" delay={0}>
            <p className="text-sm text-gray-500 dark:text-gray-400">Pending KYC</p>
            <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{stats.pendingKYC}</p>
          </MotionCard>
          <MotionCard className="p-4" delay={0.1}>
            <p className="text-sm text-gray-500 dark:text-gray-400">Approved Today</p>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.approvedToday}</p>
          </MotionCard>
          <MotionCard className="p-4" delay={0.2}>
            <p className="text-sm text-gray-500 dark:text-gray-400">Rejected Today</p>
            <p className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.rejectedToday}</p>
          </MotionCard>
          <MotionCard className="p-4" delay={0.3}>
            <p className="text-sm text-gray-500 dark:text-gray-400">Open Alerts</p>
            <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{stats.openAlerts}</p>
          </MotionCard>
          <MotionCard className="p-4" delay={0.4}>
            <p className="text-sm text-gray-500 dark:text-gray-400">Critical Alerts</p>
            <p className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.criticalAlerts}</p>
          </MotionCard>
          <MotionCard className="p-4" delay={0.5}>
            <p className="text-sm text-gray-500 dark:text-gray-400">Pending Reports</p>
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.pendingReports}</p>
          </MotionCard>
        </div>

        {/* Tabs */}
        <Card className="p-1">
          <div className="flex gap-1">
            {(['kyc', 'aml', 'reports', 'sanctions'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  activeTab === tab
                    ? 'bg-primary-600 text-white'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                {tab === 'kyc' && 'KYC Reviews'}
                {tab === 'aml' && 'AML Alerts'}
                {tab === 'reports' && 'Reports'}
                {tab === 'sanctions' && 'Sanctions Screening'}
              </button>
            ))}
          </div>
        </Card>

        {/* KYC Reviews Tab */}
        {activeTab === 'kyc' && (
          <>
            {/* Filters */}
            <Card className="p-4">
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex-1 min-w-64">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search by name or email..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-gray-400" />
                  <select
                    value={kycFilter}
                    onChange={(e) => setKycFilter(e.target.value as typeof kycFilter)}
                    className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="all">All Status</option>
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>
              </div>
            </Card>

            {/* KYC Table */}
            <Card className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
                    <tr>
                      <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Customer</th>
                      <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Document</th>
                      <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Submitted</th>
                      <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Risk Level</th>
                      <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
                      <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Assigned To</th>
                      <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {filteredKYC.map((review) => (
                      <tr key={review.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
                              <User className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                            </div>
                            <div>
                              <p className="font-medium text-sm text-gray-900 dark:text-white">{review.customerName}</p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">{review.customerEmail}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-gray-400" />
                            <span className="text-sm text-gray-900 dark:text-white">{review.documentType}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-gray-600 dark:text-gray-300">
                            {new Date(review.submittedAt).toLocaleDateString()}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          {getRiskBadge(review.riskLevel)}
                        </td>
                        <td className="px-6 py-4">
                          {getKYCStatusBadge(review.status)}
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-gray-600 dark:text-gray-300">
                            {review.assignedTo || 'Unassigned'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <button className="p-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600" title="View">
                              <Eye className="w-4 h-4" />
                            </button>
                            {review.status === 'pending' && (
                              <>
                                <button className="p-1 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded hover:bg-green-200 dark:hover:bg-green-900/50" title="Approve">
                                  <CheckCircle className="w-4 h-4" />
                                </button>
                                <button className="p-1 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded hover:bg-red-200 dark:hover:bg-red-900/50" title="Reject">
                                  <XCircle className="w-4 h-4" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </>
        )}

        {/* AML Alerts Tab */}
        {activeTab === 'aml' && (
          <Card className="overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">AML/Fraud Alerts</h2>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <select className="appearance-none bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1.5 pr-8 text-sm focus:ring-2 focus:ring-primary-500 text-gray-900 dark:text-white">
                    <option value="all">All Types</option>
                    <option value="aml">AML</option>
                    <option value="pep">PEP</option>
                    <option value="sanctions">Sanctions</option>
                    <option value="velocity">Velocity</option>
                    <option value="fraud">Fraud</option>
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
                <div className="relative">
                  <select className="appearance-none bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1.5 pr-8 text-sm focus:ring-2 focus:ring-primary-500 text-gray-900 dark:text-white">
                    <option value="all">All Severity</option>
                    <option value="critical">Critical</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
              </div>
            </div>
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {complianceAlerts.map((alert) => (
                <div key={alert.id} className={`p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 ${
                  alert.severity === 'critical' ? 'border-l-4 border-l-red-500' :
                  alert.severity === 'high' ? 'border-l-4 border-l-orange-500' : ''
                }`}>
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg ${
                        alert.type === 'sanctions' || alert.type === 'fraud' ? 'bg-red-100 dark:bg-red-900/30' :
                        alert.type === 'aml' ? 'bg-purple-100 dark:bg-purple-900/30' :
                        alert.type === 'pep' ? 'bg-blue-100 dark:bg-blue-900/30' : 'bg-orange-100 dark:bg-orange-900/30'
                      }`}>
                        {getAlertTypeIcon(alert.type)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono text-sm text-gray-500 dark:text-gray-400">{alert.id}</span>
                          <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded text-xs uppercase">
                            {alert.type}
                          </span>
                          {getSeverityBadge(alert.severity)}
                        </div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">{alert.description}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Customer: {alert.customerName} ({alert.customerId})
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        alert.status === 'open' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400' :
                        alert.status === 'investigating' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' :
                        alert.status === 'resolved' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' :
                        'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                      }`}>
                        {alert.status}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {new Date(alert.createdAt).toLocaleTimeString()}
                      </span>
                      <button className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded">
                        <Eye className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Reports Tab */}
        {activeTab === 'reports' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Card className="overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Compliance Reports</h2>
                </div>
                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                  {reports.map((report) => (
                    <div key={report.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                            <FileText className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                          </div>
                          <div>
                            <p className="font-medium text-sm text-gray-900 dark:text-white">{report.name}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{report.type} - {report.period}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="text-xs text-gray-500 dark:text-gray-400">Due: {new Date(report.dueDate).toLocaleDateString()}</p>
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                              report.status === 'submitted' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' :
                              report.status === 'generated' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' :
                              'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
                            }`}>
                              {report.status}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <button className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded" title="View">
                              <Eye className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                            </button>
                            <button className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded" title="Download">
                              <Download className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                            </button>
                            {report.status !== 'submitted' && (
                              <button className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded" title="Submit">
                                <Upload className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>

            <div className="space-y-6">
              <Card className="p-6">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-gray-900 dark:text-white">
                  <Calendar className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                  Upcoming Deadlines
                </h2>
                <div className="space-y-3">
                  <div className="p-3 bg-red-50 dark:bg-red-900/20 border-l-4 border-l-red-500 rounded-r-lg">
                    <p className="text-sm font-medium text-red-800 dark:text-red-300">Monthly SAR Filing</p>
                    <p className="text-xs text-red-600 dark:text-red-400">Due in 30 days</p>
                  </div>
                  <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-l-yellow-500 rounded-r-lg">
                    <p className="text-sm font-medium text-yellow-800 dark:text-yellow-300">Annual AML Review</p>
                    <p className="text-xs text-yellow-600 dark:text-yellow-400">Due in 75 days</p>
                  </div>
                  <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border-l-4 border-l-blue-500 rounded-r-lg">
                    <p className="text-sm font-medium text-blue-800 dark:text-blue-300">Risk Assessment Update</p>
                    <p className="text-xs text-blue-600 dark:text-blue-400">Due in 90 days</p>
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Quick Actions</h2>
                <div className="space-y-2">
                  <button className="w-full p-3 text-left bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg transition-colors flex items-center gap-3">
                    <FileCheck className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                    <span className="text-sm font-medium text-gray-900 dark:text-white">Generate SAR Report</span>
                  </button>
                  <button className="w-full p-3 text-left bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg transition-colors flex items-center gap-3">
                    <Download className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                    <span className="text-sm font-medium text-gray-900 dark:text-white">Export CTR Data</span>
                  </button>
                  <button className="w-full p-3 text-left bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg transition-colors flex items-center gap-3">
                    <Shield className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                    <span className="text-sm font-medium text-gray-900 dark:text-white">Run Sanctions Check</span>
                  </button>
                </div>
              </Card>
            </div>
          </div>
        )}

        {/* Sanctions Tab */}
        {activeTab === 'sanctions' && (
          <div className="space-y-6">
            <Card className="p-6">
              <div className="flex items-start gap-3 mb-6">
                <Shield className="w-6 h-6 text-primary-600 dark:text-primary-400" />
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Sanctions Screening</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Screen customers and transactions against global sanctions lists</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Lists Monitored</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">12</p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    <span className="px-2 py-0.5 bg-white dark:bg-gray-600 text-gray-600 dark:text-gray-300 rounded text-xs">OFAC SDN</span>
                    <span className="px-2 py-0.5 bg-white dark:bg-gray-600 text-gray-600 dark:text-gray-300 rounded text-xs">EU Sanctions</span>
                    <span className="px-2 py-0.5 bg-white dark:bg-gray-600 text-gray-600 dark:text-gray-300 rounded text-xs">UN Sanctions</span>
                    <span className="px-2 py-0.5 bg-white dark:bg-gray-600 text-gray-600 dark:text-gray-300 rounded text-xs">+9 more</span>
                  </div>
                </div>
                <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Last Updated</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">Today</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Lists are updated daily at 00:00 UTC</p>
                </div>
              </div>

              <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <h3 className="font-medium mb-4 text-gray-900 dark:text-white">Manual Screening</h3>
                <div className="flex gap-3">
                  <input
                    type="text"
                    placeholder="Enter name or entity to screen..."
                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                  <button className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center gap-2">
                    <Search className="w-4 h-4" />
                    Screen
                  </button>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="font-semibold mb-4 text-gray-900 dark:text-white">Recent Screening Results</h3>
              <div className="space-y-3">
                <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">John Smith</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Screened 5 minutes ago</p>
                    </div>
                  </div>
                  <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded text-xs font-medium">No Match</span>
                </div>
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">Global Trading Ltd</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Screened 2 hours ago</p>
                    </div>
                  </div>
                  <span className="px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded text-xs font-medium">Potential Match</span>
                </div>
                <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">Tech Innovations Inc</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Screened 3 hours ago</p>
                    </div>
                  </div>
                  <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded text-xs font-medium">No Match</span>
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
