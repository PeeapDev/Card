/**
 * AI Settings Page
 *
 * Admin page to configure AI providers and features:
 * - API key management (Groq, OpenAI, etc.)
 * - Model selection
 * - Feature toggles
 * - Usage statistics
 */

import { useState, useEffect } from 'react';
import {
  Bot,
  Save,
  Eye,
  EyeOff,
  CheckCircle,
  XCircle,
  Loader2,
  RefreshCw,
  Zap,
  Shield,
  MessageSquare,
  TrendingUp,
  AlertTriangle,
  Settings,
  TestTube,
  ToggleLeft,
  ToggleRight,
  Brain,
  Activity,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { aiService, AIProvider } from '@/services/ai.service';

// Available AI models for Groq
const GROQ_MODELS = [
  { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B', description: 'Best for complex tasks' },
  { id: 'llama-3.1-8b-instant', name: 'Llama 3.1 8B', description: 'Fast responses' },
  { id: 'mixtral-8x7b-32768', name: 'Mixtral 8x7B', description: 'Good balance of speed and quality' },
  { id: 'gemma2-9b-it', name: 'Gemma 2 9B', description: 'Google\'s efficient model' },
];

// AI Features configuration
const AI_FEATURES = [
  {
    id: 'fraud_detection',
    name: 'Fraud Detection',
    description: 'AI-powered transaction analysis to detect suspicious activity',
    icon: Shield,
    color: 'red',
  },
  {
    id: 'support_chatbot',
    name: 'Support Chatbot',
    description: 'AI assistant to help users with common questions',
    icon: MessageSquare,
    color: 'blue',
  },
  {
    id: 'risk_scoring',
    name: 'Risk Scoring',
    description: 'Automated risk assessment for users and merchants',
    icon: AlertTriangle,
    color: 'yellow',
  },
  {
    id: 'business_intelligence',
    name: 'Business Intelligence',
    description: 'AI-powered insights and predictions for merchants',
    icon: TrendingUp,
    color: 'green',
  },
];

export function AISettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showApiKey, setShowApiKey] = useState(false);
  const [testResponse, setTestResponse] = useState<string | null>(null);

  // Provider settings
  const [apiKey, setApiKey] = useState('');
  const [selectedModel, setSelectedModel] = useState('llama-3.3-70b-versatile');
  const [isActive, setIsActive] = useState(true);

  // Feature toggles
  const [enabledFeatures, setEnabledFeatures] = useState<Record<string, boolean>>({
    fraud_detection: true,
    support_chatbot: true,
    risk_scoring: true,
    business_intelligence: true,
  });

  // Usage stats
  const [usageStats, setUsageStats] = useState({
    total_requests: 0,
    total_tokens: 0,
    avg_response_time: 0,
    last_used: null as string | null,
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      await aiService.initialize();
      const provider = aiService.getProvider();

      if (provider) {
        setApiKey(provider.api_key || '');
        setSelectedModel(provider.default_model || 'llama-3.3-70b-versatile');
        setIsActive(provider.is_active);
        setUsageStats(provider.usage_stats as any || {
          total_requests: 0,
          total_tokens: 0,
          avg_response_time: 0,
          last_used: null,
        });
        if (provider.settings?.enabled_features) {
          setEnabledFeatures(provider.settings.enabled_features);
        }
      }
    } catch (err: any) {
      console.error('Failed to load AI settings:', err);
      setError('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    setError(null);

    try {
      await aiService.updateSettings({
        api_key: apiKey || null,
        default_model: selectedModel,
        is_active: isActive,
        settings: {
          enabled_features: enabledFeatures,
        },
      });

      setSuccess('AI settings saved successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const testConnection = async () => {
    if (!apiKey) {
      setError('Please enter an API key first');
      return;
    }

    setTesting(true);
    setError(null);
    setTestResponse(null);

    try {
      // Temporarily save the API key for testing
      await aiService.updateSettings({ api_key: apiKey });

      const startTime = Date.now();
      const response = await aiService.chat([
        { role: 'user', content: 'Say "Hello! AI is working correctly." in exactly those words.' },
      ], { max_tokens: 50 });

      const responseTime = Date.now() - startTime;

      setTestResponse(`Response: ${response.content}\nTokens used: ${response.usage.prompt_tokens + response.usage.completion_tokens}\nResponse time: ${responseTime}ms`);
      setSuccess('AI connection test successful!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Connection test failed');
      setTestResponse(null);
    } finally {
      setTesting(false);
    }
  };

  const toggleFeature = (featureId: string) => {
    setEnabledFeatures(prev => ({
      ...prev,
      [featureId]: !prev[featureId],
    }));
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 text-primary-600 dark:text-primary-400 animate-spin" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Bot className="w-7 h-7 text-purple-600" />
              AI Settings
            </h1>
            <p className="text-gray-500 dark:text-gray-400">Configure AI providers and features</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={loadSettings}
              className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
            <button
              onClick={saveSettings}
              disabled={saving}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2 disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Settings
            </button>
          </div>
        </div>

        {/* Success/Error Messages */}
        {success && (
          <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg flex items-center gap-2 text-green-700 dark:text-green-400">
            <CheckCircle className="w-5 h-5" />
            {success}
          </div>
        )}

        {error && (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-2 text-red-700 dark:text-red-400">
            <XCircle className="w-5 h-5" />
            {error}
          </div>
        )}

        {/* Provider Status */}
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${isActive && apiKey ? 'bg-green-100 dark:bg-green-900/30' : 'bg-gray-100 dark:bg-gray-700'}`}>
                <Zap className={`w-5 h-5 ${isActive && apiKey ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'}`} />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">AI Service Status</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {apiKey ? (isActive ? 'Active and ready' : 'Configured but disabled') : 'Not configured - add API key'}
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsActive(!isActive)}
              className={`p-2 rounded-lg transition-colors ${
                isActive ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400' : 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500'
              }`}
            >
              {isActive ? <ToggleRight className="w-8 h-8" /> : <ToggleLeft className="w-8 h-8" />}
            </button>
          </div>
        </Card>

        {/* API Configuration */}
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <Settings className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Groq API Configuration</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">Enter your Groq API key for AI features</p>
            </div>
            <button
              onClick={() => setShowApiKey(!showApiKey)}
              className="ml-auto p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
            >
              {showApiKey ? <EyeOff className="w-4 h-4 text-gray-500" /> : <Eye className="w-4 h-4 text-gray-500" />}
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">API Key</label>
              <input
                type={showApiKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="gsk_xxxxxxxxxxxxxxxxxxxx"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-purple-500"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Get your API key from <a href="https://console.groq.com/keys" target="_blank" rel="noopener noreferrer" className="text-purple-600 hover:underline">console.groq.com/keys</a>
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Default Model</label>
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-purple-500"
              >
                {GROQ_MODELS.map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.name} - {model.description}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </Card>

        {/* Test Connection */}
        <Card className="p-6 bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800">
          <div className="flex items-center gap-3 mb-4">
            <TestTube className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            <div>
              <h3 className="font-medium text-purple-900 dark:text-purple-300">Test AI Connection</h3>
              <p className="text-sm text-purple-700 dark:text-purple-400">Verify your API key is working correctly</p>
            </div>
          </div>

          <button
            onClick={testConnection}
            disabled={testing || !apiKey}
            className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
            {testing ? 'Testing...' : 'Test Connection'}
          </button>

          {testResponse && (
            <div className="mt-4 p-4 bg-white dark:bg-gray-800 rounded-lg border border-purple-200 dark:border-purple-700">
              <pre className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{testResponse}</pre>
            </div>
          )}
        </Card>

        {/* AI Features */}
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <Brain className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">AI Features</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">Enable or disable specific AI capabilities</p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            {AI_FEATURES.map((feature) => (
              <div
                key={feature.id}
                className={`p-4 rounded-lg border-2 transition-all ${
                  enabledFeatures[feature.id]
                    ? `border-${feature.color}-200 dark:border-${feature.color}-800 bg-${feature.color}-50 dark:bg-${feature.color}-900/20`
                    : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${
                      enabledFeatures[feature.id]
                        ? `bg-${feature.color}-100 dark:bg-${feature.color}-900/40`
                        : 'bg-gray-200 dark:bg-gray-700'
                    }`}>
                      <feature.icon className={`w-5 h-5 ${
                        enabledFeatures[feature.id]
                          ? `text-${feature.color}-600 dark:text-${feature.color}-400`
                          : 'text-gray-500 dark:text-gray-400'
                      }`} />
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900 dark:text-white">{feature.name}</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{feature.description}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => toggleFeature(feature.id)}
                    className="p-1"
                  >
                    {enabledFeatures[feature.id] ? (
                      <ToggleRight className="w-8 h-8 text-green-600 dark:text-green-400" />
                    ) : (
                      <ToggleLeft className="w-8 h-8 text-gray-400" />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Usage Statistics */}
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <Activity className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Usage Statistics</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">Monitor AI API usage</p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg text-center">
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{usageStats.total_requests || 0}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Requests</p>
            </div>
            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg text-center">
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{(usageStats.total_tokens || 0).toLocaleString()}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Tokens Used</p>
            </div>
            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg text-center">
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{usageStats.avg_response_time || 0}ms</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Avg Response</p>
            </div>
            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg text-center">
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {usageStats.last_used ? new Date(usageStats.last_used).toLocaleDateString() : 'Never'}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Last Used</p>
            </div>
          </div>
        </Card>

        {/* Info Box */}
        <Card className="p-6 bg-gray-50 dark:bg-gray-800/50">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Getting Started with Groq</h3>
          <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
            <p><strong>1.</strong> Create a free account at <a href="https://console.groq.com" target="_blank" rel="noopener noreferrer" className="text-purple-600 hover:underline">console.groq.com</a></p>
            <p><strong>2.</strong> Navigate to API Keys and create a new key</p>
            <p><strong>3.</strong> Copy the key (starts with gsk_) and paste it above</p>
            <p><strong>4.</strong> Click "Test Connection" to verify it works</p>
            <p className="pt-2 border-t border-gray-200 dark:border-gray-700">
              <strong>Note:</strong> Groq offers free tier with generous limits. The Llama 3.3 70B model provides excellent quality for fraud detection and support chatbots.
            </p>
          </div>
        </Card>
      </div>
    </AdminLayout>
  );
}
