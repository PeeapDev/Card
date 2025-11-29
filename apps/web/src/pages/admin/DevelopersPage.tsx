import { useState } from 'react';
import {
  Code2,
  Download,
  Upload,
  FileCode,
  Book,
  Package,
  Settings,
  Eye,
  Edit2,
  Trash2,
  Plus,
  ExternalLink,
  Check,
  Copy,
  Github,
  Globe,
  ChevronRight,
  Save,
  RefreshCw,
} from 'lucide-react';
import { AdminLayout } from '@/components/layout/AdminLayout';

interface SDKVersion {
  id: string;
  name: string;
  version: string;
  language: string;
  size: string;
  downloads: number;
  updatedAt: string;
  downloadUrl: string;
  isActive: boolean;
}

interface DocSection {
  id: string;
  title: string;
  description: string;
  lastUpdated: string;
  status: 'published' | 'draft';
}

const mockSDKs: SDKVersion[] = [
  {
    id: '1',
    name: 'JavaScript/TypeScript SDK',
    version: '1.0.0',
    language: 'javascript',
    size: '245 KB',
    downloads: 1234,
    updatedAt: '2024-01-15',
    downloadUrl: '/sdk/softtouch-sdk-1.0.0.tgz',
    isActive: true,
  },
  {
    id: '2',
    name: 'Python SDK',
    version: '1.0.0',
    language: 'python',
    size: '180 KB',
    downloads: 856,
    updatedAt: '2024-01-15',
    downloadUrl: '/sdk/softtouch-sdk-1.0.0.tar.gz',
    isActive: true,
  },
  {
    id: '3',
    name: 'PHP SDK',
    version: '1.0.0',
    language: 'php',
    size: '156 KB',
    downloads: 432,
    updatedAt: '2024-01-15',
    downloadUrl: '/sdk/softtouch-sdk-1.0.0.zip',
    isActive: true,
  },
  {
    id: '4',
    name: 'Go SDK',
    version: '0.9.0',
    language: 'go',
    size: '312 KB',
    downloads: 287,
    updatedAt: '2024-01-10',
    downloadUrl: '/sdk/softtouch-sdk-0.9.0.tar.gz',
    isActive: false,
  },
];

const mockDocs: DocSection[] = [
  {
    id: '1',
    title: 'Getting Started',
    description: 'Introduction to the SDK and quick start guide',
    lastUpdated: '2024-01-15',
    status: 'published',
  },
  {
    id: '2',
    title: 'Authentication',
    description: 'API key management and authentication flows',
    lastUpdated: '2024-01-14',
    status: 'published',
  },
  {
    id: '3',
    title: 'Payments API',
    description: 'Processing payments, refunds, and captures',
    lastUpdated: '2024-01-13',
    status: 'published',
  },
  {
    id: '4',
    title: 'Webhooks',
    description: 'Setting up and handling webhook events',
    lastUpdated: '2024-01-12',
    status: 'published',
  },
  {
    id: '5',
    title: 'Error Handling',
    description: 'Error codes and troubleshooting guide',
    lastUpdated: '2024-01-10',
    status: 'draft',
  },
];

export function DevelopersPage() {
  const [activeTab, setActiveTab] = useState<'sdks' | 'docs' | 'settings'>('sdks');
  const [sdks, setSDKs] = useState<SDKVersion[]>(mockSDKs);
  const [docs, setDocs] = useState<DocSection[]>(mockDocs);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showDocEditor, setShowDocEditor] = useState(false);
  const [editingDoc, setEditingDoc] = useState<DocSection | null>(null);
  const [copied, setCopied] = useState(false);

  const copyInstallCommand = (language: string) => {
    const commands: Record<string, string> = {
      javascript: 'npm install @softtouch/sdk',
      python: 'pip install softtouch-sdk',
      php: 'composer require softtouch/sdk',
      go: 'go get github.com/softtouch/sdk-go',
    };
    navigator.clipboard.writeText(commands[language] || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getLanguageIcon = (language: string) => {
    const icons: Record<string, string> = {
      javascript: '🟨',
      python: '🐍',
      php: '🐘',
      go: '🔵',
      java: '☕',
    };
    return icons[language] || '📦';
  };

  const toggleSDKStatus = (id: string) => {
    setSDKs(sdks.map(sdk =>
      sdk.id === id ? { ...sdk, isActive: !sdk.isActive } : sdk
    ));
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Developer Management</h1>
            <p className="text-gray-500 mt-1">
              Manage SDKs, documentation, and developer resources for merchants and agents
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowUploadModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              <Upload className="w-4 h-4" />
              Upload SDK
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex gap-8">
            {[
              { id: 'sdks', label: 'SDK Packages', icon: Package },
              { id: 'docs', label: 'Documentation', icon: Book },
              { id: 'settings', label: 'Settings', icon: Settings },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`flex items-center gap-2 px-1 py-4 border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-primary-600 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* SDK Packages Tab */}
        {activeTab === 'sdks' && (
          <div className="space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-xl p-6 border border-gray-200">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <Package className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{sdks.length}</p>
                    <p className="text-sm text-gray-500">SDK Packages</p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-xl p-6 border border-gray-200">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-green-100 rounded-lg">
                    <Download className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">
                      {sdks.reduce((sum, sdk) => sum + sdk.downloads, 0).toLocaleString()}
                    </p>
                    <p className="text-sm text-gray-500">Total Downloads</p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-xl p-6 border border-gray-200">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-purple-100 rounded-lg">
                    <Code2 className="w-6 h-6 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{sdks.filter(s => s.isActive).length}</p>
                    <p className="text-sm text-gray-500">Active SDKs</p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-xl p-6 border border-gray-200">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-orange-100 rounded-lg">
                    <Globe className="w-6 h-6 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">4</p>
                    <p className="text-sm text-gray-500">Languages</p>
                  </div>
                </div>
              </div>
            </div>

            {/* SDK List */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="p-4 border-b border-gray-200">
                <h3 className="font-semibold text-gray-900">Available SDK Packages</h3>
                <p className="text-sm text-gray-500">
                  These SDKs are available for download in merchant and agent developer portals
                </p>
              </div>
              <div className="divide-y divide-gray-200">
                {sdks.map((sdk) => (
                  <div key={sdk.id} className="p-4 hover:bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="text-3xl">{getLanguageIcon(sdk.language)}</div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium text-gray-900">{sdk.name}</h4>
                            <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
                              v{sdk.version}
                            </span>
                            {sdk.isActive ? (
                              <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">
                                Active
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 bg-gray-100 text-gray-500 text-xs rounded-full">
                                Inactive
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                            <span>{sdk.size}</span>
                            <span>•</span>
                            <span>{sdk.downloads.toLocaleString()} downloads</span>
                            <span>•</span>
                            <span>Updated {sdk.updatedAt}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => copyInstallCommand(sdk.language)}
                          className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                          title="Copy install command"
                        >
                          {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                          Install
                        </button>
                        <button
                          onClick={() => toggleSDKStatus(sdk.id)}
                          className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                            sdk.isActive
                              ? 'text-orange-600 hover:bg-orange-50'
                              : 'text-green-600 hover:bg-green-50'
                          }`}
                        >
                          {sdk.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                        <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Links */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-4">SDK Resources</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <a
                  href="https://github.com/PeeapDev/Card"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <Github className="w-6 h-6" />
                  <div>
                    <p className="font-medium text-gray-900">GitHub Repository</p>
                    <p className="text-sm text-gray-500">View source code</p>
                  </div>
                  <ExternalLink className="w-4 h-4 text-gray-400 ml-auto" />
                </a>
                <a
                  href="https://www.npmjs.com/package/@softtouch/sdk"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <Package className="w-6 h-6 text-red-600" />
                  <div>
                    <p className="font-medium text-gray-900">NPM Package</p>
                    <p className="text-sm text-gray-500">@softtouch/sdk</p>
                  </div>
                  <ExternalLink className="w-4 h-4 text-gray-400 ml-auto" />
                </a>
                <button className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left">
                  <RefreshCw className="w-6 h-6 text-blue-600" />
                  <div>
                    <p className="font-medium text-gray-900">Sync from NPM</p>
                    <p className="text-sm text-gray-500">Update SDK versions</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400 ml-auto" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Documentation Tab */}
        {activeTab === 'docs' && (
          <div className="space-y-6">
            {/* Add Doc Button */}
            <div className="flex justify-end">
              <button
                onClick={() => {
                  setEditingDoc(null);
                  setShowDocEditor(true);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Section
              </button>
            </div>

            {/* Documentation Sections */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="p-4 border-b border-gray-200">
                <h3 className="font-semibold text-gray-900">Documentation Sections</h3>
                <p className="text-sm text-gray-500">
                  Manage documentation content shown in merchant and agent developer portals
                </p>
              </div>
              <div className="divide-y divide-gray-200">
                {docs.map((doc, index) => (
                  <div key={doc.id} className="p-4 hover:bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center justify-center w-8 h-8 bg-gray-100 rounded-lg text-sm font-medium text-gray-600">
                          {index + 1}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium text-gray-900">{doc.title}</h4>
                            {doc.status === 'published' ? (
                              <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">
                                Published
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs rounded-full">
                                Draft
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-500 mt-1">{doc.description}</p>
                          <p className="text-xs text-gray-400 mt-1">Last updated: {doc.lastUpdated}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setEditingDoc(doc);
                            setShowDocEditor(true);
                          }}
                          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Code Examples Preview */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Code Examples Configuration</h3>
              <p className="text-sm text-gray-500 mb-4">
                Configure code examples shown in the SDK documentation for each language
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {['JavaScript', 'Python', 'PHP', 'Go'].map((lang) => (
                  <div
                    key={lang}
                    className="p-4 border border-gray-200 rounded-lg hover:border-primary-300 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">{lang}</span>
                      <span className="text-green-500 text-sm">✓ Configured</span>
                    </div>
                    <p className="text-sm text-gray-500">12 examples</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Developer Portal Settings</h3>

              <div className="space-y-6">
                {/* API Rate Limits */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Test Mode Rate Limit (requests/minute)
                    </label>
                    <input
                      type="number"
                      defaultValue={100}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Live Mode Rate Limit (requests/minute)
                    </label>
                    <input
                      type="number"
                      defaultValue={1000}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                </div>

                {/* Webhook Settings */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Webhook Retry Attempts
                  </label>
                  <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500">
                    <option value="3">3 attempts</option>
                    <option value="5">5 attempts</option>
                    <option value="10">10 attempts</option>
                  </select>
                </div>

                {/* API Versioning */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Default API Version
                  </label>
                  <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500">
                    <option value="2024-01">2024-01 (Latest)</option>
                    <option value="2023-10">2023-10</option>
                    <option value="2023-07">2023-07</option>
                  </select>
                </div>

                {/* Sandbox Settings */}
                <div className="pt-4 border-t border-gray-200">
                  <h4 className="font-medium text-gray-900 mb-4">Sandbox Environment</h4>
                  <div className="space-y-4">
                    <label className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        defaultChecked
                        className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                      />
                      <span className="text-sm text-gray-700">Enable sandbox environment for all developers</span>
                    </label>
                    <label className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        defaultChecked
                        className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                      />
                      <span className="text-sm text-gray-700">Auto-generate test API keys on registration</span>
                    </label>
                    <label className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                      />
                      <span className="text-sm text-gray-700">Require approval for live API key generation</span>
                    </label>
                  </div>
                </div>

                {/* Save Button */}
                <div className="pt-4 flex justify-end">
                  <button className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors">
                    <Save className="w-4 h-4" />
                    Save Settings
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Upload SDK Modal */}
        {showUploadModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white rounded-xl w-full max-w-lg mx-4 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Upload SDK Package</h3>
                <button
                  onClick={() => setShowUploadModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  ×
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    SDK Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., JavaScript SDK"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Language
                  </label>
                  <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500">
                    <option value="javascript">JavaScript/TypeScript</option>
                    <option value="python">Python</option>
                    <option value="php">PHP</option>
                    <option value="go">Go</option>
                    <option value="java">Java</option>
                    <option value="ruby">Ruby</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Version
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., 1.0.0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Package File
                  </label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-primary-400 transition-colors cursor-pointer">
                    <Upload className="w-10 h-10 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-600">
                      Drag and drop or click to upload
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      .tgz, .tar.gz, .zip (max 50MB)
                    </p>
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => setShowUploadModal(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">
                    Upload SDK
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Doc Editor Modal */}
        {showDocEditor && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white rounded-xl w-full max-w-2xl mx-4 p-6 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">
                  {editingDoc ? 'Edit Documentation Section' : 'Add Documentation Section'}
                </h3>
                <button
                  onClick={() => setShowDocEditor(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  ×
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Section Title
                  </label>
                  <input
                    type="text"
                    defaultValue={editingDoc?.title || ''}
                    placeholder="e.g., Getting Started"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <input
                    type="text"
                    defaultValue={editingDoc?.description || ''}
                    placeholder="Brief description of this section"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Content (Markdown)
                  </label>
                  <textarea
                    rows={12}
                    placeholder="Write your documentation content here using Markdown..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 font-mono text-sm"
                    defaultValue={`# ${editingDoc?.title || 'Section Title'}

## Overview
Describe what this section covers...

## Getting Started
\`\`\`javascript
import { SoftTouchSDK } from '@softtouch/sdk';

const sdk = new SoftTouchSDK({
  apiKey: 'your_api_key'
});
\`\`\`

## Next Steps
- Step 1
- Step 2
- Step 3
`}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Status
                  </label>
                  <select
                    defaultValue={editingDoc?.status || 'draft'}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="draft">Draft</option>
                    <option value="published">Published</option>
                  </select>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => setShowDocEditor(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">
                    {editingDoc ? 'Save Changes' : 'Create Section'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
