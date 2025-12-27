/**
 * AI Service - Enhanced
 *
 * Provides AI capabilities using Groq:
 * - Intelligent Support Chatbot with full platform knowledge
 * - Fraud Detection with pattern analysis
 * - Risk Scoring for users, merchants, transactions
 * - Business Intelligence with actionable insights
 */

import { supabase } from '@/lib/supabase';

// Groq API Types
interface GroqMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface GroqChoice {
  message: GroqMessage;
  finish_reason: string;
  index: number;
}

interface GroqResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: GroqChoice[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

// AI Provider configuration
export interface AIProvider {
  id: string;
  name: string;
  display_name: string;
  api_key: string | null;
  base_url: string;
  models: string[];
  default_model: string;
  is_active: boolean;
  is_default: boolean;
  rate_limit_rpm: number;
  rate_limit_tpm: number;
  usage_stats: Record<string, any>;
  settings: Record<string, any>;
}

// Chat session types
export interface ChatSession {
  id: string;
  user_id: string;
  session_type: 'support' | 'assistant' | 'dispute';
  status: 'active' | 'resolved' | 'escalated';
  context: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  id: string;
  session_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  metadata: Record<string, any>;
  created_at: string;
}

// Fraud alert types
export interface FraudAlert {
  id: string;
  transaction_id: string | null;
  user_id: string | null;
  alert_type: 'suspicious_amount' | 'unusual_location' | 'velocity' | 'pattern' | 'new_device' | 'dormant_account';
  severity: 'low' | 'medium' | 'high' | 'critical';
  risk_score: number;
  description: string;
  details: Record<string, any>;
  status: 'pending' | 'reviewed' | 'confirmed' | 'dismissed';
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
}

// Risk score types
export interface RiskScore {
  id: string;
  entity_type: 'user' | 'merchant' | 'transaction' | 'business';
  entity_id: string;
  risk_score: number;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  factors: Array<{ factor: string; impact: number; description: string }>;
  model_version: string;
  expires_at: string;
  created_at: string;
}

// Dispute Analysis types
export interface DisputeAnalysis {
  merchant_likelihood: number; // 0-100
  customer_likelihood: number; // 0-100
  confidence_score: number; // 0-100
  recommendation: 'favor_merchant' | 'favor_customer' | 'partial_refund' | 'needs_review' | 'insufficient_data';
  reasoning: string;
  fraud_risk_score: number; // 0-100
  evidence_strength: 'strong' | 'moderate' | 'weak' | 'none';
  missing_evidence: string[];
  suggested_merchant_response?: string;
  suggested_resolution: string;
  suggested_compensation?: number;
  key_factors: Array<{
    factor: string;
    weight: number;
    favors: 'merchant' | 'customer' | 'neutral';
    description: string;
  }>;
}

// User context for AI conversations
export interface UserContext {
  userName?: string;
  userEmail?: string;
  userRole?: string;
  userId?: string;
  isMerchant?: boolean;
  isVerified?: boolean;
  kycStatus?: string;
  walletBalance?: number;
  businessCount?: number;
  transactionCount?: number;
  lastTransaction?: { amount: number; date: string; type: string };
}

// Local storage key for API settings (fallback when DB not available)
const AI_SETTINGS_KEY = 'peeap_ai_settings';

// Default Groq configuration
const DEFAULT_GROQ_CONFIG: AIProvider = {
  id: 'default-groq',
  name: 'groq',
  display_name: 'Groq (Fast Inference)',
  api_key: null,
  base_url: 'https://api.groq.com/openai/v1',
  models: ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'mixtral-8x7b-32768', 'gemma2-9b-it'],
  default_model: 'llama-3.3-70b-versatile',
  is_active: true,
  is_default: true,
  rate_limit_rpm: 60,
  rate_limit_tpm: 100000,
  usage_stats: {},
  settings: {},
};

// Platform knowledge base for the AI
const PLATFORM_KNOWLEDGE = `
## PeeAP Platform Overview
PeeAP is a payment gateway platform in Sierra Leone that enables:
- Mobile money payments (Orange Money, Africell Money)
- Wallet-to-wallet transfers
- Merchant payment acceptance
- QR code payments
- Business payment links
- Virtual cards

## User Roles
- **User**: Regular user with wallet, can send/receive money, pay bills
- **Merchant**: Business owner who can accept payments, create payment links, view analytics
- **Admin**: Platform administrator with full access
- **Agent**: Cash-in/cash-out agent for mobile money

## Key Features & Navigation

### For Regular Users:
- **Dashboard** (/dashboard): Overview of wallet, recent transactions
- **Wallets** (/wallets): View wallet balance, transaction history
- **Send Money** (/send): Transfer to other users or phone numbers
- **Cards** (/cards): Virtual and physical payment cards
- **Transactions** (/transactions): Full transaction history

### For Merchants:
- **Become a Merchant**: Go to Dashboard > click "Become a Merchant" or visit /merchant/create-business
- **Merchant Dashboard** (/merchant): Business overview, sales stats
- **Payment Links** (/merchant/payment-links): Create shareable payment links
- **Transactions** (/merchant/transactions): Business transaction history
- **Businesses** (/merchant/businesses): Manage multiple businesses
- **Settings** (/merchant/settings): API keys, webhooks, payment settings

### Account Management:
- **Profile** (/profile): Update personal information
- **KYC Verification** (/verify): Complete identity verification
- **Settings** (/settings): Account preferences, security

## Common Tasks

### To Add Money to Wallet:
1. Go to Dashboard or Wallets page
2. Click "Add Money" or "Deposit"
3. Choose payment method (Mobile Money, Bank Transfer)
4. Enter amount and complete payment

### To Send Money:
1. Go to Dashboard > "Send Money"
2. Enter recipient (phone number or email)
3. Enter amount
4. Confirm and authorize transfer

### To Create a Payment Link (Merchants):
1. Go to Merchant Dashboard > Payment Links
2. Click "Create Payment Link"
3. Set name, amount, description
4. Share the generated link with customers

### To Withdraw Funds:
1. Go to Wallets > "Withdraw"
2. Choose withdrawal method
3. Enter amount and account details
4. Confirm withdrawal

## Fees
- Wallet-to-wallet transfers: Usually free within platform
- Mobile money deposits: Varies by provider (typically 1-2%)
- Merchant transactions: 2.5% per transaction
- Withdrawals: Varies by method

## Support
- For urgent issues, users can contact support at support@peeap.com
- Business hours: 8AM - 6PM GMT
`;

class AIService {
  private provider: AIProvider | null = null;
  private initialized = false;
  private conversationHistory: Map<string, GroqMessage[]> = new Map();

  /**
   * Initialize the AI service with provider settings
   */
  async initialize(): Promise<boolean> {
    if (this.initialized && this.provider) return true;

    try {
      // Try to get from database first
      const { data: providers, error } = await supabase
        .from('ai_providers')
        .select('*')
        .eq('is_default', true)
        .eq('is_active', true)
        .limit(1);

      if (!error && providers && providers.length > 0) {
        this.provider = providers[0];
        this.initialized = true;
        return true;
      }

      // Fallback to localStorage
      const stored = localStorage.getItem(AI_SETTINGS_KEY);
      if (stored) {
        const settings = JSON.parse(stored);
        this.provider = { ...DEFAULT_GROQ_CONFIG, ...settings };
        this.initialized = true;
        return true;
      }

      // Use default config (no API key)
      this.provider = DEFAULT_GROQ_CONFIG;
      this.initialized = true;
      return false; // Not fully configured
    } catch (err) {
      console.error('Failed to initialize AI service:', err);
      this.provider = DEFAULT_GROQ_CONFIG;
      this.initialized = true;
      return false;
    }
  }

  /**
   * Check if AI is configured with an API key
   */
  isConfigured(): boolean {
    return !!(this.provider?.api_key);
  }

  /**
   * Get current provider settings
   */
  getProvider(): AIProvider | null {
    return this.provider;
  }

  /**
   * Update provider settings
   */
  async updateSettings(settings: Partial<AIProvider>): Promise<boolean> {
    try {
      const updated = { ...this.provider, ...settings };

      // Try to save to database
      const { error } = await supabase
        .from('ai_providers')
        .upsert({
          id: updated.id || 'default-groq',
          name: updated.name,
          display_name: updated.display_name,
          api_key: updated.api_key,
          base_url: updated.base_url,
          models: updated.models,
          default_model: updated.default_model,
          is_active: updated.is_active,
          is_default: updated.is_default,
          rate_limit_rpm: updated.rate_limit_rpm,
          rate_limit_tpm: updated.rate_limit_tpm,
          usage_stats: updated.usage_stats,
          settings: updated.settings,
          updated_at: new Date().toISOString(),
        });

      if (error) {
        console.log('DB save failed, using localStorage:', error.message);
        localStorage.setItem(AI_SETTINGS_KEY, JSON.stringify(updated));
      }

      this.provider = updated as AIProvider;
      return true;
    } catch (err) {
      console.error('Failed to update AI settings:', err);
      localStorage.setItem(AI_SETTINGS_KEY, JSON.stringify({ ...this.provider, ...settings }));
      this.provider = { ...this.provider, ...settings } as AIProvider;
      return true;
    }
  }

  /**
   * Make a chat completion request
   */
  async chat(
    messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
    options?: {
      model?: string;
      temperature?: number;
      max_tokens?: number;
    }
  ): Promise<{ content: string; usage: { prompt_tokens: number; completion_tokens: number } }> {
    await this.initialize();

    if (!this.provider?.api_key) {
      throw new Error('AI service not configured. Please add your API key in Settings > AI.');
    }

    const model = options?.model || this.provider.default_model;
    const temperature = options?.temperature ?? 0.7;
    const max_tokens = options?.max_tokens ?? 2048;

    const response = await fetch(`${this.provider.base_url}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.provider.api_key}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature,
        max_tokens,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error?.message || `AI request failed: ${response.status}`);
    }

    const data: GroqResponse = await response.json();

    return {
      content: data.choices[0]?.message?.content || '',
      usage: {
        prompt_tokens: data.usage.prompt_tokens,
        completion_tokens: data.usage.completion_tokens,
      },
    };
  }

  /**
   * Build comprehensive user context for AI
   */
  private buildUserContext(context?: UserContext): string {
    if (!context) return '';

    const parts: string[] = [];

    parts.push(`\n## CURRENT USER SESSION (User is LOGGED IN)`);
    parts.push(`- Name: ${context.userName || 'Unknown'}`);
    parts.push(`- Email: ${context.userEmail || 'N/A'}`);
    parts.push(`- Role: ${context.userRole || 'user'}`);
    parts.push(`- Account Verified: ${context.isVerified ? 'Yes' : 'No'}`);
    parts.push(`- KYC Status: ${context.kycStatus || 'pending'}`);

    if (context.isMerchant) {
      parts.push(`- Merchant Status: Active Merchant`);
      if (context.businessCount) parts.push(`- Number of Businesses: ${context.businessCount}`);
    } else {
      parts.push(`- Merchant Status: Not a merchant yet`);
    }

    if (context.walletBalance !== undefined) {
      parts.push(`- Wallet Balance: Le ${context.walletBalance.toLocaleString()}`);
    }

    if (context.transactionCount !== undefined) {
      parts.push(`- Total Transactions: ${context.transactionCount}`);
    }

    if (context.lastTransaction) {
      parts.push(`- Last Transaction: ${context.lastTransaction.type} of Le ${context.lastTransaction.amount} on ${context.lastTransaction.date}`);
    }

    parts.push(`\n## CRITICAL INSTRUCTIONS:`);
    parts.push(`- The user is ALREADY SIGNED IN. NEVER ask them to sign up, register, or create an account.`);
    parts.push(`- Guide them based on their actual role and status shown above.`);
    parts.push(`- Be specific with navigation paths and button names.`);
    parts.push(`- Keep responses concise and actionable (2-4 sentences max).`);

    if (!context.isMerchant) {
      parts.push(`- If they want to become a merchant, tell them: "Go to your Dashboard and click 'Become a Merchant', or visit /merchant/create-business"`);
    }

    if (!context.isVerified) {
      parts.push(`- If they need to verify: "Complete your KYC verification at /verify to unlock all features"`);
    }

    return parts.join('\n');
  }

  /**
   * Get support chatbot response with full context
   */
  async getSupportResponse(userMessage: string, context?: UserContext, sessionId?: string): Promise<string> {
    const userContext = this.buildUserContext(context);

    const systemPrompt = `You are PeeAP's AI Support Assistant - helpful, knowledgeable, and concise.

${PLATFORM_KNOWLEDGE}
${userContext}

## Response Guidelines:
1. Be direct and helpful - give specific steps, not vague guidance
2. Use the navigation paths provided (e.g., "Go to /merchant/payment-links")
3. If you can solve their problem, solve it. If not, suggest contacting support@peeap.com
4. Keep responses SHORT - 2-4 sentences max unless explaining a process
5. Use bullet points for multi-step instructions
6. Never invent features that don't exist
7. If unsure, say so and suggest human support`;

    // Get or create conversation history
    const historyKey = sessionId || 'default';
    let history = this.conversationHistory.get(historyKey) || [];

    // Add user message to history
    history.push({ role: 'user', content: userMessage });

    // Keep only last 10 messages to avoid token limits
    if (history.length > 10) {
      history = history.slice(-10);
    }

    const messages: GroqMessage[] = [
      { role: 'system', content: systemPrompt },
      ...history,
    ];

    const result = await this.chat(messages, { temperature: 0.7, max_tokens: 500 });

    // Add assistant response to history
    history.push({ role: 'assistant', content: result.content });
    this.conversationHistory.set(historyKey, history);

    return result.content;
  }

  /**
   * Clear conversation history for a session
   */
  clearConversationHistory(sessionId?: string): void {
    const historyKey = sessionId || 'default';
    this.conversationHistory.delete(historyKey);
  }

  /**
   * Analyze transaction for fraud risk - Enhanced
   */
  async analyzeTransactionRisk(transaction: {
    amount: number;
    currency: string;
    sender_id: string;
    sender_name?: string;
    recipient_id?: string;
    recipient_name?: string;
    type: string;
    location?: string;
    ip_address?: string;
    device_info?: Record<string, any>;
    timestamp?: string;
    previous_transactions?: Array<{ amount: number; timestamp: string; type: string }>;
    user_stats?: {
      account_age_days: number;
      total_transactions: number;
      average_transaction: number;
      max_transaction: number;
      last_login: string;
    };
  }): Promise<{
    risk_score: number;
    risk_level: 'low' | 'medium' | 'high' | 'critical';
    factors: Array<{ factor: string; impact: number; description: string }>;
    recommendation: 'approve' | 'review' | 'block';
    alerts: string[];
  }> {
    const systemPrompt = `You are an expert fraud detection AI for PeeAP payment platform in Sierra Leone.

Analyze the transaction and return a detailed JSON assessment. Consider:

## Red Flags to Check:
1. **Amount Anomalies**: Transaction significantly higher than user's average
2. **Velocity**: Multiple transactions in short time
3. **New Account Activity**: Large transactions on new accounts
4. **Dormant Account**: Sudden activity after long inactivity
5. **Device/Location**: New device or unusual location
6. **Time Pattern**: Transactions at unusual hours (midnight in local timezone)
7. **Recipient Pattern**: Transfers to new or suspicious recipients
8. **Round Numbers**: Exactly round amounts (100000, 500000) can indicate money laundering

## Risk Scoring:
- 0-25: Low risk - Approve automatically
- 26-50: Medium risk - Approve with monitoring
- 51-75: High risk - Require manual review
- 76-100: Critical - Block and alert

Return ONLY valid JSON:
{
  "risk_score": <number 0-100>,
  "risk_level": "<low|medium|high|critical>",
  "factors": [
    {"factor": "<name>", "impact": <1-10>, "description": "<explanation>"}
  ],
  "recommendation": "<approve|review|block>",
  "alerts": ["<specific alert messages for admin>"]
}`;

    const result = await this.chat([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: JSON.stringify(transaction) },
    ], { temperature: 0.2, max_tokens: 1024 });

    try {
      // Extract JSON from response (handle potential markdown wrapping)
      const jsonMatch = result.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      return JSON.parse(result.content);
    } catch {
      // Default safe response if parsing fails
      return {
        risk_score: 30,
        risk_level: 'medium',
        factors: [{ factor: 'analysis_error', impact: 5, description: 'Could not complete full analysis' }],
        recommendation: 'review',
        alerts: ['AI analysis incomplete - manual review recommended'],
      };
    }
  }

  /**
   * Calculate user risk score based on their profile and behavior
   */
  async calculateUserRiskScore(user: {
    id: string;
    account_age_days: number;
    kyc_status: string;
    email_verified: boolean;
    phone_verified: boolean;
    transaction_count: number;
    total_volume: number;
    average_transaction: number;
    failed_transactions: number;
    dispute_count: number;
    login_frequency: string;
    last_password_change_days?: number;
    has_2fa: boolean;
    countries_used: string[];
    devices_used: number;
  }): Promise<{
    risk_score: number;
    risk_level: 'low' | 'medium' | 'high' | 'critical';
    factors: Array<{ factor: string; impact: number; description: string; is_positive: boolean }>;
    recommendations: string[];
  }> {
    const systemPrompt = `You are a risk assessment AI for PeeAP payment platform.

Evaluate the user's risk profile considering:

## Positive Factors (reduce risk):
- Verified KYC
- Email and phone verified
- Account age > 90 days
- Consistent transaction patterns
- 2FA enabled
- Regular login activity

## Negative Factors (increase risk):
- No KYC verification
- High failed transaction rate
- Multiple disputes
- Many devices (>5 suggests account sharing)
- Multiple countries (unusual for Sierra Leone users)
- Dormant then suddenly active
- No 2FA on high-volume account

Return ONLY valid JSON:
{
  "risk_score": <number 0-100>,
  "risk_level": "<low|medium|high|critical>",
  "factors": [
    {"factor": "<name>", "impact": <1-10>, "description": "<explanation>", "is_positive": <true|false>}
  ],
  "recommendations": ["<actionable recommendations for reducing risk>"]
}`;

    const result = await this.chat([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: JSON.stringify(user) },
    ], { temperature: 0.2, max_tokens: 1024 });

    try {
      const jsonMatch = result.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      return JSON.parse(result.content);
    } catch {
      return {
        risk_score: 50,
        risk_level: 'medium',
        factors: [{ factor: 'analysis_pending', impact: 5, description: 'Risk assessment in progress', is_positive: false }],
        recommendations: ['Complete KYC verification', 'Enable 2FA'],
      };
    }
  }

  /**
   * Get business insights - Enhanced
   */
  async getBusinessInsights(data: {
    business_name: string;
    business_type: string;
    revenue_data: Array<{ date: string; amount: number; transaction_count: number }>;
    total_customers: number;
    new_customers_this_period: number;
    returning_customers: number;
    average_order_value: number;
    top_products?: Array<{ name: string; revenue: number; quantity: number }>;
    peak_hours?: Array<{ hour: number; transactions: number }>;
    payment_methods?: Record<string, number>;
    refund_rate?: number;
    period: 'week' | 'month' | 'quarter';
  }): Promise<{
    summary: string;
    performance_score: number;
    trends: Array<{ trend: string; direction: 'up' | 'down' | 'stable'; percentage?: number }>;
    insights: string[];
    recommendations: Array<{ priority: 'high' | 'medium' | 'low'; action: string; expected_impact: string }>;
    predictions: {
      next_period_revenue: number;
      confidence: number;
      factors: string[];
    };
  }> {
    const systemPrompt = `You are a business intelligence AI for PeeAP merchants in Sierra Leone.

Analyze the business data and provide actionable insights. Consider local context:
- Currency is Sierra Leonean Leone (Le)
- Most transactions are mobile money
- Business hours typically 8AM-8PM
- Weekend activity varies by business type

Return ONLY valid JSON:
{
  "summary": "<2-3 sentence performance summary>",
  "performance_score": <number 0-100>,
  "trends": [
    {"trend": "<description>", "direction": "<up|down|stable>", "percentage": <optional number>}
  ],
  "insights": ["<specific observations about the business>"],
  "recommendations": [
    {"priority": "<high|medium|low>", "action": "<specific action to take>", "expected_impact": "<what improvement to expect>"}
  ],
  "predictions": {
    "next_period_revenue": <predicted revenue number>,
    "confidence": <0-100 confidence level>,
    "factors": ["<factors influencing prediction>"]
  }
}`;

    const result = await this.chat([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: JSON.stringify(data) },
    ], { temperature: 0.4, max_tokens: 1500 });

    try {
      const jsonMatch = result.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      return JSON.parse(result.content);
    } catch {
      return {
        summary: 'Analysis in progress. Please ensure sufficient data is available.',
        performance_score: 0,
        trends: [],
        insights: ['Insufficient data for complete analysis'],
        recommendations: [{ priority: 'high', action: 'Add more transaction data', expected_impact: 'Enable AI insights' }],
        predictions: { next_period_revenue: 0, confidence: 0, factors: ['Insufficient historical data'] },
      };
    }
  }

  // ==========================================
  // DISPUTE RESOLUTION AI - THREE-WAY SYSTEM
  // ==========================================

  /**
   * Dispute Analysis Result Type
   */
  private disputeAnalysisCache: Map<string, DisputeAnalysis> = new Map();

  /**
   * Full three-way dispute analysis
   * Analyzes: Customer claim, Merchant response, Transaction evidence
   */
  async analyzeDisputeFull(dispute: {
    id: string;
    transaction_id: string;
    amount: number;
    currency: string;
    transaction_date: string;
    reason: string; // 'duplicate', 'fraudulent', 'product_not_received', etc.
    customer_statement: string;
    customer_email?: string;
    merchant_response?: string;
    merchant_name: string;
    business_name: string;
    transaction_details?: {
      payment_method?: string;
      ip_address?: string;
      device_info?: string;
      delivery_status?: string;
      delivery_date?: string;
    };
    evidence?: {
      customer_evidence?: string[];
      merchant_evidence?: string[];
    };
    history?: {
      customer_disputes: number;
      customer_total_transactions: number;
      customer_account_age_days: number;
      merchant_disputes: number;
      merchant_total_transactions: number;
      merchant_dispute_win_rate?: number;
    };
  }): Promise<DisputeAnalysis> {
    const systemPrompt = `You are an expert dispute resolution AI for PeeAP payment platform in Sierra Leone.

Your role is to analyze disputes fairly between customers and merchants, providing recommendations to platform admins.

## Dispute Types:
- **duplicate**: Customer charged multiple times
- **fraudulent**: Customer claims they didn't authorize the transaction
- **product_not_received**: Customer didn't receive product/service
- **product_unacceptable**: Product/service not as described
- **subscription_canceled**: Charged after cancellation
- **unrecognized**: Customer doesn't recognize the charge
- **credit_not_processed**: Refund not received
- **general**: Other issues

## Analysis Framework:
1. **Customer Perspective**: Evaluate claim validity based on statement and evidence
2. **Merchant Perspective**: Evaluate response and counter-evidence
3. **Transaction Evidence**: Analyze technical transaction data
4. **Historical Patterns**: Consider dispute history of both parties
5. **Fraud Risk**: Assess if dispute itself might be fraudulent

## Fairness Guidelines:
- Be objective - don't favor either party without evidence
- Consider that both parties may be partially correct
- Weight evidence quality over quantity
- Account for local context (Sierra Leone market)

Return ONLY valid JSON:
{
  "merchant_likelihood": <number 0-100, chance merchant wins>,
  "customer_likelihood": <number 0-100, chance customer wins>,
  "confidence_score": <number 0-100, AI confidence>,
  "recommendation": "<favor_merchant|favor_customer|partial_refund|needs_review|insufficient_data>",
  "reasoning": "<detailed explanation of analysis>",
  "fraud_risk_score": <number 0-100, is dispute itself fraudulent?>,
  "evidence_strength": "<strong|moderate|weak|none>",
  "missing_evidence": ["<list of evidence that would help>"],
  "suggested_merchant_response": "<if merchant hasn't responded, suggest response>",
  "suggested_resolution": "<recommended action for admin>",
  "suggested_compensation": <number, if partial refund recommended>,
  "key_factors": [
    {"factor": "<name>", "weight": <1-10>, "favors": "<merchant|customer|neutral>", "description": "<explanation>"}
  ]
}`;

    const result = await this.chat([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: JSON.stringify(dispute) },
    ], { temperature: 0.2, max_tokens: 2048 });

    try {
      const jsonMatch = result.content.match(/\{[\s\S]*\}/);
      const analysis = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(result.content);

      // Cache the result
      this.disputeAnalysisCache.set(dispute.id, analysis);

      // Save to database
      await this.saveDisputeAnalysis(dispute.id, analysis);

      return analysis;
    } catch {
      return {
        merchant_likelihood: 50,
        customer_likelihood: 50,
        confidence_score: 0,
        recommendation: 'needs_review',
        reasoning: 'Automated analysis incomplete - manual review required',
        fraud_risk_score: 0,
        evidence_strength: 'none',
        missing_evidence: ['Complete transaction logs', 'Customer communication history', 'Delivery confirmation'],
        suggested_merchant_response: undefined,
        suggested_resolution: 'Assign to human reviewer for detailed analysis',
        suggested_compensation: undefined,
        key_factors: [],
      };
    }
  }

  /**
   * Generate AI-suggested response for merchant
   */
  async generateMerchantResponse(dispute: {
    reason: string;
    customer_statement: string;
    amount: number;
    currency: string;
    transaction_date: string;
    business_name: string;
    transaction_details?: Record<string, any>;
    has_delivery_proof?: boolean;
    has_communication_proof?: boolean;
    product_delivered?: boolean;
    service_provided?: boolean;
  }): Promise<{
    suggested_response: string;
    evidence_to_include: string[];
    strength_assessment: 'strong' | 'moderate' | 'weak';
    tips: string[];
  }> {
    const systemPrompt = `You are an AI assistant helping merchants write professional dispute responses.

Generate a response that:
1. Is professional and factual
2. Directly addresses the customer's claim
3. Provides evidence references
4. Remains courteous while defending the merchant's position

## Response Guidelines:
- Start by acknowledging the dispute
- State the facts clearly
- Reference available evidence
- Explain what the customer received/purchased
- End with a proposed resolution

Return ONLY valid JSON:
{
  "suggested_response": "<the actual response text to submit>",
  "evidence_to_include": ["<list of evidence the merchant should attach>"],
  "strength_assessment": "<strong|moderate|weak based on available facts>",
  "tips": ["<suggestions to strengthen the case>"]
}`;

    const result = await this.chat([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: JSON.stringify(dispute) },
    ], { temperature: 0.5, max_tokens: 1024 });

    try {
      const jsonMatch = result.content.match(/\{[\s\S]*\}/);
      return jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(result.content);
    } catch {
      return {
        suggested_response: `Thank you for bringing this to our attention. We at ${dispute.business_name} take all disputes seriously. Regarding the transaction on ${dispute.transaction_date} for ${dispute.currency} ${dispute.amount}, we would like to provide the following information: [Please add your specific details here]. We remain committed to resolving this matter fairly.`,
        evidence_to_include: ['Transaction receipt', 'Delivery confirmation', 'Customer communication records'],
        strength_assessment: 'moderate',
        tips: ['Attach any delivery proof', 'Include screenshots of customer communication', 'Provide timeline of events'],
      };
    }
  }

  /**
   * Analyze customer dispute for chatbot assistance
   */
  async assistCustomerDispute(context: {
    userMessage: string;
    disputeStatus?: string;
    disputeReason?: string;
    amount?: number;
    hasActiveDispute: boolean;
    previousMessages?: string[];
  }): Promise<string> {
    const systemPrompt = `You are a helpful AI assistant for PeeAP customers with disputes.

Your role is to:
1. Help customers understand the dispute process
2. Explain what happens at each stage
3. Answer questions about their specific dispute
4. NEVER promise specific outcomes
5. Be empathetic but factual

## Dispute Process:
1. **Filed**: Customer submits dispute with reason and description
2. **Under Review**: Merchant has 7 days to respond
3. **Admin Review**: PeeAP reviews both sides
4. **Resolution**: Decision made (full refund, partial refund, or favor merchant)

## Timeline:
- Most disputes resolved within 14 days
- Complex cases may take up to 30 days
- Customer notified at each stage

Current user context:
${context.hasActiveDispute ? `- Has active dispute (Status: ${context.disputeStatus || 'pending'})` : '- No active dispute'}
${context.disputeReason ? `- Dispute reason: ${context.disputeReason}` : ''}
${context.amount ? `- Disputed amount: Le ${context.amount.toLocaleString()}` : ''}

Respond helpfully and concisely (2-4 sentences). If they need to take action, explain exactly what to do.`;

    const messages: GroqMessage[] = [
      { role: 'system', content: systemPrompt },
    ];

    if (context.previousMessages) {
      context.previousMessages.forEach((msg, i) => {
        messages.push({ role: i % 2 === 0 ? 'user' : 'assistant', content: msg });
      });
    }

    messages.push({ role: 'user', content: context.userMessage });

    const result = await this.chat(messages, { temperature: 0.6, max_tokens: 500 });
    return result.content;
  }

  /**
   * Find similar past disputes for case comparison
   */
  async findSimilarDisputes(dispute: {
    reason: string;
    amount: number;
    merchant_id?: string;
    customer_id?: string;
  }): Promise<Array<{
    id: string;
    reason: string;
    amount: number;
    outcome: string;
    similarity_score: number;
  }>> {
    try {
      // Query past resolved disputes with similar characteristics
      const { data, error } = await supabase
        .from('disputes')
        .select('id, reason, amount, resolution, status')
        .eq('reason', dispute.reason)
        .in('status', ['resolved', 'won', 'lost', 'closed'])
        .order('created_at', { ascending: false })
        .limit(10);

      if (error || !data) return [];

      // Calculate similarity scores
      return data.map(d => ({
        id: d.id,
        reason: d.reason,
        amount: d.amount,
        outcome: d.resolution || d.status,
        similarity_score: this.calculateDisputeSimilarity(dispute, d),
      })).sort((a, b) => b.similarity_score - a.similarity_score).slice(0, 5);
    } catch {
      return [];
    }
  }

  private calculateDisputeSimilarity(current: { reason: string; amount: number }, past: { reason: string; amount: number }): number {
    let score = 0;

    // Same reason = 50 points
    if (current.reason === past.reason) score += 50;

    // Similar amount = up to 50 points
    const amountDiff = Math.abs(current.amount - past.amount) / Math.max(current.amount, past.amount);
    score += Math.max(0, 50 - (amountDiff * 100));

    return Math.round(score);
  }

  /**
   * Save dispute analysis to database
   */
  async saveDisputeAnalysis(disputeId: string, analysis: DisputeAnalysis): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('ai_dispute_analysis')
        .upsert({
          dispute_id: disputeId,
          merchant_likelihood: analysis.merchant_likelihood,
          customer_likelihood: analysis.customer_likelihood,
          confidence_score: analysis.confidence_score,
          recommendation: analysis.recommendation,
          reasoning: analysis.reasoning,
          fraud_risk_score: analysis.fraud_risk_score,
          evidence_strength: analysis.evidence_strength,
          missing_evidence: analysis.missing_evidence,
          suggested_merchant_response: analysis.suggested_merchant_response,
          suggested_resolution: analysis.suggested_resolution,
          suggested_compensation: analysis.suggested_compensation,
          model_used: this.provider?.default_model || 'llama-3.3-70b-versatile',
          updated_at: new Date().toISOString(),
        }, { onConflict: 'dispute_id' });

      if (error) throw error;
      return true;
    } catch (err) {
      console.error('Failed to save dispute analysis:', err);
      return false;
    }
  }

  /**
   * Get cached or saved dispute analysis
   */
  async getDisputeAnalysis(disputeId: string): Promise<DisputeAnalysis | null> {
    // Check cache first
    if (this.disputeAnalysisCache.has(disputeId)) {
      return this.disputeAnalysisCache.get(disputeId)!;
    }

    // Try database
    try {
      const { data, error } = await supabase
        .from('ai_dispute_analysis')
        .select('*')
        .eq('dispute_id', disputeId)
        .single();

      if (error || !data) return null;

      const analysis: DisputeAnalysis = {
        merchant_likelihood: data.merchant_likelihood,
        customer_likelihood: data.customer_likelihood,
        confidence_score: data.confidence_score,
        recommendation: data.recommendation,
        reasoning: data.reasoning,
        fraud_risk_score: data.fraud_risk_score,
        evidence_strength: data.evidence_strength,
        missing_evidence: data.missing_evidence || [],
        suggested_merchant_response: data.suggested_merchant_response,
        suggested_resolution: data.suggested_resolution,
        suggested_compensation: data.suggested_compensation,
        key_factors: [],
      };

      this.disputeAnalysisCache.set(disputeId, analysis);
      return analysis;
    } catch {
      return null;
    }
  }

  /**
   * Simple dispute analysis (backwards compatible)
   */
  async analyzeDispute(dispute: {
    transaction_id: string;
    amount: number;
    transaction_date: string;
    dispute_type: 'unauthorized' | 'not_received' | 'duplicate' | 'wrong_amount' | 'other';
    customer_statement: string;
    merchant_response?: string;
    transaction_details: Record<string, any>;
    customer_history?: {
      total_transactions: number;
      previous_disputes: number;
      account_age_days: number;
    };
  }): Promise<{
    assessment: 'likely_valid' | 'needs_investigation' | 'likely_invalid';
    confidence: number;
    reasoning: string[];
    suggested_resolution: string;
    additional_info_needed: string[];
  }> {
    const systemPrompt = `You are a dispute resolution AI for PeeAP payment platform.

Analyze the dispute objectively and provide an assessment. Consider:
- Transaction evidence
- Customer and merchant statements
- Historical patterns
- Common fraud indicators

Be fair to both parties. Return ONLY valid JSON:
{
  "assessment": "<likely_valid|needs_investigation|likely_invalid>",
  "confidence": <0-100>,
  "reasoning": ["<specific reasons for assessment>"],
  "suggested_resolution": "<recommended action>",
  "additional_info_needed": ["<what else would help clarify>"]
}`;

    const result = await this.chat([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: JSON.stringify(dispute) },
    ], { temperature: 0.3, max_tokens: 1024 });

    try {
      const jsonMatch = result.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      return JSON.parse(result.content);
    } catch {
      return {
        assessment: 'needs_investigation',
        confidence: 0,
        reasoning: ['Automated analysis incomplete'],
        suggested_resolution: 'Assign to human reviewer',
        additional_info_needed: ['Complete transaction logs', 'Customer communication history'],
      };
    }
  }

  // Database operations for chat sessions and alerts

  async createChatSession(userId: string, type: 'support' | 'assistant' | 'dispute' = 'support'): Promise<ChatSession | null> {
    try {
      const { data, error } = await supabase
        .from('ai_chat_sessions')
        .insert({
          user_id: userId,
          session_type: type,
          status: 'active',
          context: {},
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (err) {
      console.error('Failed to create chat session:', err);
      return null;
    }
  }

  async saveChatMessage(sessionId: string, role: 'user' | 'assistant', content: string, metadata?: Record<string, any>): Promise<ChatMessage | null> {
    try {
      const { data, error } = await supabase
        .from('ai_chat_messages')
        .insert({
          session_id: sessionId,
          role,
          content,
          metadata: metadata || {},
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (err) {
      console.error('Failed to save chat message:', err);
      return null;
    }
  }

  async getChatHistory(sessionId: string): Promise<ChatMessage[]> {
    try {
      const { data, error } = await supabase
        .from('ai_chat_messages')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (err) {
      console.error('Failed to get chat history:', err);
      return [];
    }
  }

  async createFraudAlert(alert: Omit<FraudAlert, 'id' | 'created_at' | 'reviewed_by' | 'reviewed_at'>): Promise<FraudAlert | null> {
    try {
      const { data, error } = await supabase
        .from('ai_fraud_alerts')
        .insert({
          ...alert,
          status: 'pending',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (err) {
      console.error('Failed to create fraud alert:', err);
      return null;
    }
  }

  async getPendingFraudAlerts(): Promise<FraudAlert[]> {
    try {
      const { data, error } = await supabase
        .from('ai_fraud_alerts')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data || [];
    } catch (err) {
      console.error('Failed to get fraud alerts:', err);
      return [];
    }
  }

  async updateFraudAlertStatus(alertId: string, status: 'reviewed' | 'confirmed' | 'dismissed', reviewerId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('ai_fraud_alerts')
        .update({
          status,
          reviewed_by: reviewerId,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', alertId);

      if (error) throw error;
      return true;
    } catch (err) {
      console.error('Failed to update fraud alert:', err);
      return false;
    }
  }

  async getRiskScore(entityType: string, entityId: string): Promise<RiskScore | null> {
    try {
      const { data, error } = await supabase
        .from('ai_risk_scores')
        .select('*')
        .eq('entity_type', entityType)
        .eq('entity_id', entityId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data;
    } catch (err) {
      console.error('Failed to get risk score:', err);
      return null;
    }
  }

  async updateRiskScore(score: Omit<RiskScore, 'id' | 'created_at'>): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('ai_risk_scores')
        .upsert({
          ...score,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'entity_type,entity_id' });

      if (error) throw error;
      return true;
    } catch (err) {
      console.error('Failed to update risk score:', err);
      return false;
    }
  }
}

// Export singleton instance
export const aiService = new AIService();
