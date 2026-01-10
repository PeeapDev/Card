import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Analytics } from '@vercel/analytics/react';
import { HelmetProvider } from 'react-helmet-async';
import { AuthProvider } from '@/context/AuthContext';
import { NFCProvider } from '@/hooks/useNFC';
import { DeveloperModeProvider } from '@/context/DeveloperModeContext';
import { AppsProvider } from '@/context/AppsContext';
import { UserAppsProvider } from '@/context/UserAppsContext';
import { BusinessProvider } from '@/context/BusinessContext';
import { NotificationProvider } from '@/context/NotificationContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { ThemeColorProvider } from '@/context/ThemeColorContext';
import { NotificationWrapper } from '@/components/ui/NotificationWrapper';
import { AnalyticsTracker } from '@/components/AnalyticsTracker';
import { InactivityTracker } from '@/components/InactivityTracker';
import { POSManifestSwitcher } from '@/components/pwa/POSManifestSwitcher';
import { POSAppGuard } from '@/components/pwa/POSAppGuard';
import { AIChatbot } from '@/components/ai/AIChatbot';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { RoleBasedRoute } from '@/components/RoleBasedRoute';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import NotFoundPage from '@/pages/NotFoundPage';
import { LandingPage } from '@/pages/LandingPage';
import { LoginPage } from '@/pages/auth/LoginPage';
import { RegisterPage } from '@/pages/auth/RegisterPage';
import { SsoPage } from '@/pages/auth/SsoPage';
import { OAuthAuthorizePage } from '@/pages/auth/OAuthAuthorizePage';
import { DashboardPage } from '@/pages/DashboardPage';
import { WalletsPage } from '@/pages/WalletsPage';
import { CardsPage } from '@/pages/CardsPage';
import { TransactionsPage } from '@/pages/TransactionsPage';
import { ProfilePage } from '@/pages/ProfilePage';
import { ApiDocsPage } from '@/pages/ApiDocsPage';
import { SendMoneyPage } from '@/pages/SendMoneyPage';
import { ReceiveMoneyPage } from '@/pages/ReceiveMoneyPage';
import { PayoutPage } from '@/pages/PayoutPage';
import { PotsPage } from '@/pages/PotsPage';
import { PotDetailPage } from '@/pages/PotDetailPage';
import { SupportPage } from '@/pages/SupportPage';
import { VerifyPage } from '@/pages/VerifyPage';
// New Card Management Pages
import { CardMarketplacePage } from '@/pages/CardMarketplacePage';
import { MyCardsPage } from '@/pages/MyCardsPage';
// Services Pages
import { BillPaymentsPage } from '@/pages/BillPaymentsPage';
import { AirtimeTopupPage } from '@/pages/AirtimeTopupPage';
import { CashbackRewardsPage } from '@/pages/CashbackRewardsPage';
import { BnplPage } from '@/pages/BnplPage';
import { CashOutPage } from '@/pages/CashOutPage';
import { SpendingAnalyticsPage } from '@/pages/SpendingAnalyticsPage';
import { WithdrawPage } from '@/pages/WithdrawPage';

// Marketplace Pages
import { MarketplacePage } from '@/pages/MarketplacePage';
import { StorefrontPage } from '@/pages/StorefrontPage';
import { MarketplaceCheckoutPage } from '@/pages/MarketplaceCheckoutPage';

// Admin Pages
import { AdminDashboard } from '@/pages/admin/AdminDashboard';
import { AuthorizationPage } from '@/pages/admin/AuthorizationPage';
import { WebhooksPage } from '@/pages/admin/WebhooksPage';
import { CompliancePage } from '@/pages/admin/CompliancePage';
import { CustomersPage } from '@/pages/admin/CustomersPage';
import { AccountsPage } from '@/pages/admin/AccountsPage';
import { CardsPage as AdminCardsPage } from '@/pages/admin/CardsPage';
import { CardProgramsPage } from '@/pages/admin/CardProgramsPage';
import { CardTypesPage } from '@/pages/admin/CardTypesPage';
import { CardOrdersPage } from '@/pages/admin/CardOrdersPage';
import { NFCPaymentPage as AdminNFCPaymentPage } from '@/pages/admin/NFCPaymentPage';
import { TransactionsPage as AdminTransactionsPage } from '@/pages/admin/TransactionsPage';
import { DisputesPage } from '@/pages/admin/DisputesPage';
import { UserDisputesPage } from '@/pages/DisputesPage';
import MessagesPage from '@/pages/MessagesPage';
import SupportInboxPage from '@/pages/admin/SupportInboxPage';
import Modules from '@/pages/admin/Modules';
import CardProducts from '@/pages/admin/CardProducts';
import { DevelopersPage } from '@/pages/admin/DevelopersPage';
import { UsersManagementPage } from '@/pages/admin/UsersManagementPage';
import { UserDetailPage } from '@/pages/admin/UserDetailPage';
import { MerchantsManagementPage } from '@/pages/admin/MerchantsManagementPage';
import { CreateMerchantPage } from '@/pages/admin/CreateMerchantPage';
import { AgentsManagementPage } from '@/pages/admin/AgentsManagementPage';
import { FeeSettingsPage } from '@/pages/admin/FeeSettingsPage';
import { KycVerificationsPage } from '@/pages/admin/KycVerificationsPage';
import { PaymentSettingsPage } from '@/pages/admin/PaymentSettingsPage';
import { DepositsPage } from '@/pages/admin/DepositsPage';
import { SubscriptionsPage } from '@/pages/admin/SubscriptionsPage';
import { RolesManagementPage } from '@/pages/admin/RolesManagementPage';
import { PotsManagementPage } from '@/pages/admin/PotsManagementPage';
import { BusinessCategoriesPage } from '@/pages/admin/BusinessCategoriesPage';
import { BusinessesPage } from '@/pages/admin/BusinessesPage';
import { BusinessDetailPage } from '@/pages/admin/BusinessDetailPage';
import { DriversPage } from '@/pages/admin/DriversPage';
import { FuelStationsPage } from '@/pages/admin/FuelStationsPage';
import { SupportTicketsPage } from '@/pages/admin/SupportTicketsPage';
import { AdminNotificationsPage } from '@/pages/admin/AdminNotificationsPage';
import { SmtpSettingsPage } from '@/pages/admin/SmtpSettingsPage';
import { AISettingsPage } from '@/pages/admin/AISettingsPage';
import { PushNotificationsPage } from '@/pages/admin/PushNotificationsPage';
import SsoSettingsPage from '@/pages/admin/SsoSettingsPage';
import { WebsiteAnalyticsPage } from '@/pages/admin/WebsiteAnalyticsPage';
import { ExchangeRatesPage } from '@/pages/admin/ExchangeRatesPage';
import { AdminVirtualCardsPage } from '@/pages/admin/AdminVirtualCardsPage';
import { NRRDashboardPage } from '@/pages/admin/NRRDashboardPage';
import { SiteSettingsPage } from '@/pages/admin/SiteSettingsPage';
import { PagesManagementPage } from '@/pages/admin/PagesManagementPage';
import { PageEditorPage } from '@/pages/admin/PageEditorPage';
import { DynamicPage } from '@/pages/DynamicPage';
import { VirtualCardsPage } from '@/pages/VirtualCardsPage';
import { PaymentCheckoutPage } from '@/pages/PaymentCheckoutPage';
import { PayPage } from '@/pages/PayPage';
import { PaymentSuccessPage } from '@/pages/PaymentSuccessPage';
import { PaymentCancelPage } from '@/pages/PaymentCancelPage';
import { DepositSuccessPage } from '@/pages/DepositSuccessPage';
import { DepositCancelPage } from '@/pages/DepositCancelPage';
import { BusinessCheckoutPage } from '@/pages/BusinessCheckoutPage';
import { CheckoutPage } from '@/pages/CheckoutPage';
import { HostedCheckoutPage } from '@/pages/HostedCheckoutPage';
import { PaymentIntentPage } from '@/pages/PaymentIntentPage';
import { SubscriptionCheckoutPage } from '@/pages/SubscriptionCheckoutPage';
import { CheckoutSuccessPage } from '@/pages/CheckoutSuccessPage';
import { ScanPayPage } from '@/pages/ScanPayPage';
import { TestCheckoutPage } from '@/pages/TestCheckoutPage';
import { AppPaymentRedirectPage } from '@/pages/AppPaymentRedirectPage';
import { NFCPaymentPage } from '@/pages/NFCPaymentPage';
import { PaymentLinkCheckoutPage } from '@/pages/PaymentLinkCheckoutPage';
import { OnboardingPage } from '@/pages/OnboardingPage';

// Merchant Pages
import { MerchantDashboard } from '@/pages/merchant/MerchantDashboard';
import { MerchantSettingsPage } from '@/pages/merchant/MerchantSettingsPage';
import { MerchantDeveloperPage } from '@/pages/merchant/MerchantDeveloperPage';
import { BusinessIntegrationPage } from '@/pages/merchant/BusinessIntegrationPage';
import { MerchantApiKeysPage } from '@/pages/merchant/MerchantApiKeysPage';
import { MerchantTransactionsPage } from '@/pages/merchant/MerchantTransactionsPage';
import { MerchantPayoutsPage } from '@/pages/merchant/MerchantPayoutsPage';
import { MerchantRefundsPage } from '@/pages/merchant/MerchantRefundsPage';
import { MerchantReportsPage } from '@/pages/merchant/MerchantReportsPage';
import { MerchantStatementPage } from '@/pages/merchant/MerchantStatementPage';
import { MerchantPaymentLinksPage } from '@/pages/merchant/MerchantPaymentLinksPage';
import { MerchantSubscriptionsPage } from '@/pages/merchant/MerchantSubscriptionsPage';
import { AppSubscriptionPage } from '@/pages/merchant/AppSubscriptionPage';
import MerchantInvoicesPage from '@/pages/merchant/MerchantInvoicesPage';
import NewInvoicePage from '@/pages/merchant/NewInvoicePage';
import InvoiceDetailsPage from '@/pages/merchant/InvoiceDetailsPage';
import InvoiceSettingsPage from '@/pages/merchant/InvoiceSettingsPage';
import { MerchantProfilePage } from '@/pages/merchant/MerchantProfilePage';
import { CreateBusinessPage } from '@/pages/merchant/CreateBusinessPage';
import { CreateDeveloperBusinessPage } from '@/pages/merchant/CreateDeveloperBusinessPage';
import { MerchantBusinessesPage } from '@/pages/merchant/MerchantBusinessesPage';
import { MerchantUpgradePage } from '@/pages/merchant/MerchantUpgradePage';
// MerchantSubscriptionPage has been merged into MerchantSubscriptionsPage
import { CollectPaymentPage } from '@/pages/merchant/CollectPaymentPage';
import { DriverWalletPage } from '@/pages/merchant/DriverWalletPage';
import { MerchantPaymentTerminalPage } from '@/pages/merchant/MerchantPaymentTerminalPage';
import { MerchantBusinessDetailPage } from '@/pages/merchant/BusinessDetailPage';
import { MerchantBusinessTransactionsPage } from '@/pages/merchant/BusinessTransactionsPage';
import { MerchantBusinessDisputesPage } from '@/pages/merchant/BusinessDisputesPage';
import { MerchantBusinessSettingsPage } from '@/pages/merchant/BusinessSettingsPage';
import { MerchantSupportPage } from '@/pages/merchant/MerchantSupportPage';
import { MerchantNotificationsPage } from '@/pages/merchant/MerchantNotificationsPage';
// POS Pages
import { POSTerminalPage, POSProductsPage, POSSalesPage, POSSetupWizard, POSReportsPage, POSStaffPage, POSInventoryPage, POSLoyaltyPage, POSSettingsPage, POSKitchenDisplayPage, POSCustomerDisplayPage, POSTableManagementPage, POSCustomersPage, POSSuppliersPage, POSDiscountsPage, POSPurchaseOrdersPage, POSMarketplacePage, POSPaymentCallbackPage, POSReceiptsPage } from '@/pages/merchant/pos';
import { POSLabelsPage } from '@/pages/merchant/pos/POSLabelsPage';
import { POSAppPage } from '@/pages/merchant/apps/POSAppPage';
// Events Pages
import { EventsAppPage } from '@/pages/merchant/apps/EventsAppPage';
import { EventsSetupWizard, EventsListPage, EventFormPage, EventDetailsPage, EventTicketTypesPage, EventStaffPage, EventScannerPage, EventAnalyticsPage, EventWalletPage } from '@/pages/merchant/events';
// User Notifications
import { UserNotificationsPage } from '@/pages/UserNotificationsPage';
// Staff POS
import StaffPOSPage from '@/pages/user/StaffPOSPage';
// User Events Pages
import { UserEventsPage } from '@/pages/user/UserEventsPage';
import { UserEventDetailPage } from '@/pages/user/UserEventDetailPage';
import { MyTicketsPage } from '@/pages/user/MyTicketsPage';
import { StaffEventScannerPage } from '@/pages/user/StaffEventScannerPage';
// Settings and Cash Box
import { SettingsPage } from '@/pages/SettingsPage';
import { CashBoxSetupWizard } from '@/components/cashbox/CashBoxSetupWizard';
// Agent Pages
import { AgentDashboard } from '@/pages/agent/AgentDashboard';
import { AgentNotificationsPage } from '@/pages/agent/AgentNotificationsPage';
import { AgentSettingsPage } from '@/pages/agent/AgentSettingsPage';
import { AgentDeveloperPage } from '@/pages/agent/AgentDeveloperPage';
import { AgentTransactionsPage } from '@/pages/agent/AgentTransactionsPage';
import { AgentCashOutPage } from '@/pages/agent/AgentCashOutPage';
import { AgentFloatPage } from '@/pages/agent/AgentFloatPage';

// School Pages
import {
  SchoolDashboard,
  SchoolOnboardingPage,
  SchoolStudentsPage,
  SchoolVendorsPage,
  SchoolShopPage,
  SchoolTransactionsPage,
  SchoolSettingsPage,
  SchoolFeesPage,
  SchoolStaffPage,
  SchoolAccountingPage,
  SchoolSalaryPage,
  SchoolInvoicesPage,
  SchoolReportsPage,
  SchoolLoginPage,
} from '@/pages/school';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
});

// Get the app mode from environment variable
const APP_MODE = import.meta.env.VITE_APP_MODE || 'full'; // 'checkout', 'merchant', 'school', or 'full'
console.log('[Peeap] APP_MODE:', APP_MODE, '| VITE_APP_MODE:', import.meta.env.VITE_APP_MODE);

// Debug log for troubleshooting

function App() {
  // Determine which routes to show
  const isCheckoutMode = APP_MODE === 'checkout';
  const isMerchantMode = APP_MODE === 'merchant';
  const isSchoolMode = APP_MODE === 'school';
  const isFullMode = APP_MODE === 'full' || (!isCheckoutMode && !isMerchantMode && !isSchoolMode); // Fallback to full if mode is invalid

  return (
    <ErrorBoundary>
      <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <BrowserRouter>
            <AuthProvider>
              <ThemeColorProvider>
              <InactivityTracker>
              <NFCProvider>
              <NotificationProvider>
                <DeveloperModeProvider>
                  <AppsProvider>
                    <UserAppsProvider>
                      <BusinessProvider>
                  <NotificationWrapper />
                  <AnalyticsTracker />
                  <Analytics />
                  <POSManifestSwitcher />
                <POSAppGuard>
                <Routes>
              {/* Checkout App - Only show checkout and payment routes */}
              {isCheckoutMode && (
                <>
                  {/* Redirect root to hosted checkout info page or 404 */}
                  <Route path="/" element={<Navigate to="/checkout/pay/invalid" replace />} />

                  {/* Auth routes for scan-to-pay flow */}
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/register" element={<RegisterPage />} />

                  {/* Payment Checkout Routes (NFC/QR) */}
                  <Route path="/t/:token" element={<PaymentCheckoutPage />} />
                  <Route path="/i/:intentId" element={<PaymentIntentPage />} />

                  {/* Payment Link Route (query params) */}
                  <Route path="/pay" element={<PayPage />} />

                  {/* Secure NFC Payment Route */}
                  <Route path="/pay/nfc/:shortCode" element={<NFCPaymentPage />} />

                  {/* Payment Link Checkout Route - must come before single param route */}
                  <Route path="/pay/:businessSlug/:linkSlug" element={<PaymentLinkCheckoutPage />} />
                  <Route path="/pay/:token" element={<PaymentCheckoutPage />} />

                  {/* Payment Success/Cancel Routes */}
                  <Route path="/payment/success" element={<PaymentSuccessPage />} />
                  <Route path="/payment/cancel" element={<PaymentCancelPage />} />

                  {/* Deposit Success/Cancel Routes */}
                  <Route path="/deposit/success" element={<DepositSuccessPage />} />
                  <Route path="/deposit/cancel" element={<DepositCancelPage />} />

                  {/* Business Checkout Route - SDK uses /checkout/:businessId */}
                  <Route path="/checkout/:businessId" element={<BusinessCheckoutPage />} />

                  {/* Hosted Checkout Page - Universal developer checkout like Stripe/PayPal */}
                  <Route path="/checkout/pay/:sessionId" element={<HostedCheckoutPage />} />

                  {/* Subscription Checkout Page - For recurring subscriptions */}
                  <Route path="/subscribe/:planId" element={<SubscriptionCheckoutPage />} />

                  {/* Checkout Success Page - Displayed after successful payment */}
                  <Route path="/checkout/success" element={<CheckoutSuccessPage />} />

                  {/* Scan to Pay - For QR code scans from checkout page */}
                  <Route path="/scan-pay/:sessionId" element={<ScanPayPage />} />

                  {/* App Payment Redirect - Smart deep link handler for QR scans */}
                  <Route path="/app/pay/:paymentId" element={<AppPaymentRedirectPage />} />

                  {/* Catch-all redirect */}
                  <Route path="*" element={<Navigate to="/" replace />} />
                </>
              )}

              {/* School App - School partner portal for managing student wallets */}
              {isSchoolMode && (
                <>
                  {/* Public routes */}
                  <Route path="/" element={<Navigate to="/school" replace />} />
                  <Route path="/login" element={<SchoolLoginPage />} />
                  <Route path="/register" element={<Navigate to="/onboard" replace />} />

                  {/* School Onboarding - Session-based registration */}
                  <Route path="/onboard" element={<SchoolOnboardingPage />} />

                  {/* School Dashboard and Management */}
                  <Route
                    path="/school"
                    element={
                      <ProtectedRoute>
                        <SchoolDashboard />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/school/students"
                    element={
                      <ProtectedRoute>
                        <SchoolStudentsPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/school/vendors"
                    element={
                      <ProtectedRoute>
                        <SchoolVendorsPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/school/shop"
                    element={
                      <ProtectedRoute>
                        <SchoolShopPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/school/transactions"
                    element={
                      <ProtectedRoute>
                        <SchoolTransactionsPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/school/settings"
                    element={
                      <ProtectedRoute>
                        <SchoolSettingsPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/school/fees"
                    element={
                      <ProtectedRoute>
                        <SchoolFeesPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/school/staff"
                    element={
                      <ProtectedRoute>
                        <SchoolStaffPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/school/accounting"
                    element={
                      <ProtectedRoute>
                        <SchoolAccountingPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/school/salary"
                    element={
                      <ProtectedRoute>
                        <SchoolSalaryPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/school/invoices"
                    element={
                      <ProtectedRoute>
                        <SchoolInvoicesPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/school/reports"
                    element={
                      <ProtectedRoute>
                        <SchoolReportsPage />
                      </ProtectedRoute>
                    }
                  />

                  {/* Catch-all redirect */}
                  <Route path="*" element={<Navigate to="/school" replace />} />
                </>
              )}

              {/* Merchant App - Show merchant, admin, agent, and regular user routes */}
              {isMerchantMode && (
                <>
                  {/* Public routes */}
                  <Route path="/" element={<LandingPage />} />
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/register" element={<RegisterPage />} />
                  <Route path="/auth/sso" element={<SsoPage />} />
                  <Route path="/auth/authorize" element={<OAuthAuthorizePage />} />
                  <Route path="/docs" element={<ApiDocsPage />} />

                  {/* Dynamic Pages - Public pages created with page builder */}
                  <Route path="/p/:slug" element={<DynamicPage />} />

                  {/* Payment Checkout Routes (Public - for QR scans) */}
                  <Route path="/scan-pay/:sessionId" element={<ScanPayPage />} />
                  <Route path="/checkout/pay/:sessionId" element={<HostedCheckoutPage />} />
                  <Route path="/checkout/:businessId" element={<BusinessCheckoutPage />} />
                  <Route path="/checkout/success" element={<CheckoutSuccessPage />} />
                  <Route path="/t/:token" element={<PaymentCheckoutPage />} />
                  <Route path="/i/:intentId" element={<PaymentIntentPage />} />
                  <Route path="/pay" element={<PayPage />} />
                  <Route path="/pay/nfc/:shortCode" element={<NFCPaymentPage />} />
                  <Route path="/pay/:businessSlug/:linkSlug" element={<PaymentLinkCheckoutPage />} />
                  <Route path="/pay/:token" element={<PaymentCheckoutPage />} />
                  <Route path="/app/pay/:paymentId" element={<AppPaymentRedirectPage />} />

              {/* Onboarding Route */}
              <Route
                path="/onboarding"
                element={
                  <ProtectedRoute>
                    <OnboardingPage />
                  </ProtectedRoute>
                }
              />

              {/* Regular User Protected Routes */}
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <DashboardPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/verify"
                element={
                  <ProtectedRoute>
                    <VerifyPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/wallets"
                element={
                  <ProtectedRoute>
                    <WalletsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/cards"
                element={
                  <ProtectedRoute>
                    <MyCardsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/cards/marketplace"
                element={
                  <ProtectedRoute>
                    <CardMarketplacePage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/cards/legacy"
                element={
                  <ProtectedRoute>
                    <CardsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/cards/virtual"
                element={
                  <ProtectedRoute>
                    <VirtualCardsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/transactions"
                element={
                  <ProtectedRoute>
                    <TransactionsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/profile"
                element={
                  <ProtectedRoute>
                    <ProfilePage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/send"
                element={
                  <ProtectedRoute>
                    <SendMoneyPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/receive"
                element={
                  <ProtectedRoute>
                    <ReceiveMoneyPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/payout"
                element={
                  <ProtectedRoute>
                    <PayoutPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/pots"
                element={
                  <ProtectedRoute>
                    <PotsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/pots/:potId"
                element={
                  <ProtectedRoute>
                    <PotDetailPage />
                  </ProtectedRoute>
                }
              />
              {/* Services Routes */}
              <Route
                path="/bills"
                element={
                  <ProtectedRoute>
                    <BillPaymentsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/airtime"
                element={
                  <ProtectedRoute>
                    <AirtimeTopupPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/cashback"
                element={
                  <ProtectedRoute>
                    <CashbackRewardsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/bnpl"
                element={
                  <ProtectedRoute>
                    <BnplPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/cashout"
                element={
                  <ProtectedRoute>
                    <CashOutPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/withdraw"
                element={
                  <ProtectedRoute>
                    <WithdrawPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/analytics"
                element={
                  <ProtectedRoute>
                    <SpendingAnalyticsPage />
                  </ProtectedRoute>
                }
              />
              {/* Settings and Cash Box */}
              <Route
                path="/settings"
                element={
                  <ProtectedRoute>
                    <SettingsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/cashbox/setup"
                element={
                  <ProtectedRoute>
                    <CashBoxSetupWizard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/support"
                element={
                  <ProtectedRoute>
                    <SupportPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/disputes"
                element={
                  <ProtectedRoute>
                    <UserDisputesPage />
                  </ProtectedRoute>
                }
              />
              {/* Staff POS Route - For users who are staff at a merchant's POS */}
              <Route
                path="/dashboard/pos"
                element={
                  <ProtectedRoute>
                    <StaffPOSPage />
                  </ProtectedRoute>
                }
              />
              {/* User Events Routes */}
              <Route
                path="/events"
                element={
                  <ProtectedRoute>
                    <UserEventsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/events/:eventId"
                element={
                  <ProtectedRoute>
                    <UserEventDetailPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/my-tickets"
                element={
                  <ProtectedRoute>
                    <MyTicketsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/staff-events/:eventId/scan"
                element={
                  <ProtectedRoute>
                    <StaffEventScannerPage />
                  </ProtectedRoute>
                }
              />
              {/* Ticket validation - redirects from Scan to Pay when event ticket detected */}
              <Route
                path="/events/:eventId/validate/:ticketNumber"
                element={
                  <ProtectedRoute>
                    <StaffEventScannerPage />
                  </ProtectedRoute>
                }
              />
              {/* Marketplace Routes - Public */}
              <Route path="/marketplace" element={<MarketplacePage />} />
              <Route path="/marketplace/store/:storeSlug" element={<StorefrontPage />} />
              <Route
                path="/marketplace/checkout/:storeId"
                element={
                  <ProtectedRoute>
                    <MarketplaceCheckoutPage />
                  </ProtectedRoute>
                }
              />
              {/* Admin Routes */}
              <Route
                path="/admin"
                element={
                  <RoleBasedRoute allowedRoles={['admin', 'superadmin']}>
                    <AdminDashboard />
                  </RoleBasedRoute>
                }
              />
              <Route
                path="/admin/accounts"
                element={
                  <RoleBasedRoute allowedRoles={['admin', 'superadmin']}>
                    <AccountsPage />
                  </RoleBasedRoute>
                }
              />
              <Route
                path="/admin/wallets"
                element={
                  <RoleBasedRoute allowedRoles={['admin', 'superadmin']}>
                    <AccountsPage />
                  </RoleBasedRoute>
                }
              />
              <Route
                path="/admin/customers"
                element={
                  <RoleBasedRoute allowedRoles={['admin', 'superadmin']}>
                    <CustomersPage />
                  </RoleBasedRoute>
                }
              />
              <Route
                path="/admin/cards"
                element={
                  <RoleBasedRoute allowedRoles={['admin', 'superadmin']}>
                    <AdminCardsPage />
                  </RoleBasedRoute>
                }
              />
              <Route
                path="/admin/card-programs"
                element={
                  <RoleBasedRoute allowedRoles={['admin', 'superadmin']}>
                    <CardProgramsPage />
                  </RoleBasedRoute>
                }
              />
              <Route
                path="/admin/card-types"
                element={
                  <RoleBasedRoute allowedRoles={['admin', 'superadmin']}>
                    <CardTypesPage />
                  </RoleBasedRoute>
                }
              />
              <Route
                path="/admin/card-orders"
                element={
                  <RoleBasedRoute allowedRoles={['admin', 'superadmin']}>
                    <CardOrdersPage />
                  </RoleBasedRoute>
                }
              />
              <Route
                path="/admin/virtual-cards"
                element={
                  <RoleBasedRoute allowedRoles={['admin', 'superadmin']}>
                    <AdminVirtualCardsPage />
                  </RoleBasedRoute>
                }
              />
              <Route
                path="/admin/card-products"
                element={
                  <RoleBasedRoute allowedRoles={['admin', 'superadmin']}>
                    <CardProducts />
                  </RoleBasedRoute>
                }
              />
              <Route
                path="/admin/modules"
                element={
                  <RoleBasedRoute allowedRoles={['admin', 'superadmin']}>
                    <Modules />
                  </RoleBasedRoute>
                }
              />
              <Route
                path="/admin/authorization"
                element={
                  <RoleBasedRoute allowedRoles={['admin', 'superadmin']}>
                    <AuthorizationPage />
                  </RoleBasedRoute>
                }
              />
              <Route
                path="/admin/transactions"
                element={
                  <RoleBasedRoute allowedRoles={['admin', 'superadmin']}>
                    <AdminTransactionsPage />
                  </RoleBasedRoute>
                }
              />
              <Route
                path="/admin/disputes"
                element={
                  <RoleBasedRoute allowedRoles={['admin', 'superadmin']}>
                    <DisputesPage />
                  </RoleBasedRoute>
                }
              />
              <Route
                path="/admin/users"
                element={
                  <RoleBasedRoute allowedRoles={['admin', 'superadmin']}>
                    <UsersManagementPage />
                  </RoleBasedRoute>
                }
              />
              <Route
                path="/admin/users/:userId"
                element={
                  <RoleBasedRoute allowedRoles={['admin', 'superadmin']}>
                    <UserDetailPage />
                  </RoleBasedRoute>
                }
              />
              <Route
                path="/admin/merchants"
                element={
                  <RoleBasedRoute allowedRoles={['admin', 'superadmin']}>
                    <MerchantsManagementPage />
                  </RoleBasedRoute>
                }
              />
              <Route
                path="/admin/merchants/create"
                element={
                  <RoleBasedRoute allowedRoles={['admin', 'superadmin']}>
                    <CreateMerchantPage />
                  </RoleBasedRoute>
                }
              />
              <Route
                path="/admin/agents"
                element={
                  <RoleBasedRoute allowedRoles={['admin', 'superadmin']}>
                    <AgentsManagementPage />
                  </RoleBasedRoute>
                }
              />
              <Route
                path="/admin/kyc-verifications"
                element={
                  <RoleBasedRoute allowedRoles={['admin', 'superadmin']}>
                    <KycVerificationsPage />
                  </RoleBasedRoute>
                }
              />
              <Route
                path="/admin/fee-settings"
                element={
                  <RoleBasedRoute allowedRoles={['admin', 'superadmin']}>
                    <FeeSettingsPage />
                  </RoleBasedRoute>
                }
              />
              <Route
                path="/admin/payment-settings"
                element={
                  <RoleBasedRoute allowedRoles={['admin', 'superadmin']}>
                    <PaymentSettingsPage />
                  </RoleBasedRoute>
                }
              />
              <Route
                path="/admin/deposits"
                element={
                  <RoleBasedRoute allowedRoles={['admin', 'superadmin']}>
                    <DepositsPage />
                  </RoleBasedRoute>
                }
              />
              <Route
                path="/admin/subscriptions"
                element={
                  <RoleBasedRoute allowedRoles={['admin', 'superadmin']}>
                    <SubscriptionsPage />
                  </RoleBasedRoute>
                }
              />
              <Route
                path="/admin/nrr"
                element={
                  <RoleBasedRoute allowedRoles={['admin', 'superadmin']}>
                    <NRRDashboardPage />
                  </RoleBasedRoute>
                }
              />
              <Route
                path="/admin/roles"
                element={
                  <RoleBasedRoute allowedRoles={['admin', 'superadmin']}>
                    <RolesManagementPage />
                  </RoleBasedRoute>
                }
              />
              <Route
                path="/admin/pots"
                element={
                  <RoleBasedRoute allowedRoles={['admin', 'superadmin']}>
                    <PotsManagementPage />
                  </RoleBasedRoute>
                }
              />
              <Route
                path="/admin/business-categories"
                element={
                  <RoleBasedRoute allowedRoles={['admin', 'superadmin']}>
                    <BusinessCategoriesPage />
                  </RoleBasedRoute>
                }
              />
              <Route
                path="/admin/businesses"
                element={
                  <RoleBasedRoute allowedRoles={['admin', 'superadmin']}>
                    <BusinessesPage />
                  </RoleBasedRoute>
                }
              />
              <Route
                path="/admin/businesses/:businessId"
                element={
                  <RoleBasedRoute allowedRoles={['admin', 'superadmin']}>
                    <MerchantBusinessDetailPage />
                  </RoleBasedRoute>
                }
              />
              <Route
                path="/admin/webhooks"
                element={
                  <RoleBasedRoute allowedRoles={['admin', 'superadmin']}>
                    <WebhooksPage />
                  </RoleBasedRoute>
                }
              />
              <Route
                path="/admin/compliance"
                element={
                  <RoleBasedRoute allowedRoles={['admin', 'superadmin']}>
                    <CompliancePage />
                  </RoleBasedRoute>
                }
              />
              <Route
                path="/admin/developers"
                element={
                  <RoleBasedRoute allowedRoles={['admin', 'superadmin']}>
                    <DevelopersPage />
                  </RoleBasedRoute>
                }
              />
              <Route
                path="/admin/support"
                element={
                  <RoleBasedRoute allowedRoles={['admin', 'superadmin']}>
                    <SupportTicketsPage />
                  </RoleBasedRoute>
                }
              />
              <Route
                path="/admin/notifications"
                element={
                  <RoleBasedRoute allowedRoles={['admin', 'superadmin']}>
                    <AdminNotificationsPage />
                  </RoleBasedRoute>
                }
              />
              <Route
                path="/admin/smtp-settings"
                element={
                  <RoleBasedRoute allowedRoles={['admin', 'superadmin']}>
                    <SmtpSettingsPage />
                  </RoleBasedRoute>
                }
              />
              <Route
                path="/admin/ai-settings"
                element={
                  <RoleBasedRoute allowedRoles={['admin', 'superadmin']}>
                    <AISettingsPage />
                  </RoleBasedRoute>
                }
              />
              <Route
                path="/admin/push-notifications"
                element={
                  <RoleBasedRoute allowedRoles={['admin', 'superadmin']}>
                    <PushNotificationsPage />
                  </RoleBasedRoute>
                }
              />
              <Route
                path="/admin/site-settings"
                element={
                  <RoleBasedRoute allowedRoles={['admin', 'superadmin']}>
                    <SiteSettingsPage />
                  </RoleBasedRoute>
                }
              />
              <Route
                path="/admin/settings/sso"
                element={
                  <RoleBasedRoute allowedRoles={['admin', 'superadmin']}>
                    <SsoSettingsPage />
                  </RoleBasedRoute>
                }
              />
              <Route
                path="/admin/site-settings"
                element={
                  <RoleBasedRoute allowedRoles={['admin', 'superadmin']}>
                    <SiteSettingsPage />
                  </RoleBasedRoute>
                }
              />
              <Route
                path="/admin/exchange-rates"
                element={
                  <RoleBasedRoute allowedRoles={['admin', 'superadmin']}>
                    <ExchangeRatesPage />
                  </RoleBasedRoute>
                }
              />
              {/* Pages Management Routes */}
              <Route
                path="/admin/pages"
                element={
                  <RoleBasedRoute allowedRoles={['admin', 'superadmin']}>
                    <PagesManagementPage />
                  </RoleBasedRoute>
                }
              />
              <Route
                path="/admin/pages/:pageId/edit"
                element={
                  <RoleBasedRoute allowedRoles={['admin', 'superadmin']}>
                    <PageEditorPage />
                  </RoleBasedRoute>
                }
              />
              {/* Transport Routes */}
              <Route
                path="/admin/drivers"
                element={
                  <RoleBasedRoute allowedRoles={['admin', 'superadmin']}>
                    <DriversPage />
                  </RoleBasedRoute>
                }
              />
              <Route
                path="/admin/fuel-stations"
                element={
                  <RoleBasedRoute allowedRoles={['admin', 'superadmin']}>
                    <FuelStationsPage />
                  </RoleBasedRoute>
                }
              />

              {/* Merchant Routes */}
              <Route
                path="/merchant"
                element={
                  <RoleBasedRoute allowedRoles={['merchant']}>
                    <MerchantDashboard />
                  </RoleBasedRoute>
                }
              />
              <Route
                path="/merchant/transactions"
                element={
                  <RoleBasedRoute allowedRoles={['merchant']}>
                    <MerchantTransactionsPage />
                  </RoleBasedRoute>
                }
              />
              <Route
                path="/merchant/payouts"
                element={
                  <RoleBasedRoute allowedRoles={['merchant']}>
                    <MerchantPayoutsPage />
                  </RoleBasedRoute>
                }
              />
              <Route
                path="/merchant/refunds"
                element={
                  <RoleBasedRoute allowedRoles={['merchant']}>
                    <MerchantRefundsPage />
                  </RoleBasedRoute>
                }
              />
              <Route
                path="/merchant/reports"
                element={
                  <RoleBasedRoute allowedRoles={['merchant']}>
                    <MerchantReportsPage />
                  </RoleBasedRoute>
                }
              />
              <Route
                path="/merchant/payment-links"
                element={
                  <RoleBasedRoute allowedRoles={['merchant']}>
                    <MerchantPaymentLinksPage />
                  </RoleBasedRoute>
                }
              />
              <Route
                path="/merchant/profile"
                element={
                  <RoleBasedRoute allowedRoles={['merchant']}>
                    <MerchantProfilePage />
                  </RoleBasedRoute>
                }
              />
              <Route
                path="/merchant/create-business"
                element={
                  <RoleBasedRoute allowedRoles={['merchant']}>
                    <CreateBusinessPage />
                  </RoleBasedRoute>
                }
              />
              <Route
                path="/merchant/settings"
                element={
                  <RoleBasedRoute allowedRoles={['merchant']}>
                    <MerchantSettingsPage />
                  </RoleBasedRoute>
                }
              />
              <Route
                path="/merchant/support"
                element={
                  <RoleBasedRoute allowedRoles={['merchant']}>
                    <MerchantSupportPage />
                  </RoleBasedRoute>
                }
              />
              <Route
                path="/merchant/collect-payment"
                element={
                  <RoleBasedRoute allowedRoles={['merchant']}>
                    <CollectPaymentPage />
                  </RoleBasedRoute>
                }
              />
              <Route
                path="/merchant/businesses"
                element={
                  <RoleBasedRoute allowedRoles={['merchant']}>
                    <MerchantBusinessesPage />
                  </RoleBasedRoute>
                }
              />
              <Route
                path="/merchant/upgrade"
                element={
                  <RoleBasedRoute allowedRoles={['merchant']}>
                    <MerchantUpgradePage />
                  </RoleBasedRoute>
                }
              />
              <Route
                path="/merchant/businesses/:businessId"
                element={
                  <RoleBasedRoute allowedRoles={['merchant']}>
                    <MerchantBusinessDetailPage />
                  </RoleBasedRoute>
                }
              />
              <Route
                path="/merchant/businesses/:businessId/transactions"
                element={
                  <RoleBasedRoute allowedRoles={['merchant']}>
                    <MerchantBusinessTransactionsPage />
                  </RoleBasedRoute>
                }
              />
              <Route
                path="/merchant/businesses/:businessId/disputes"
                element={
                  <RoleBasedRoute allowedRoles={['merchant']}>
                    <MerchantBusinessDisputesPage />
                  </RoleBasedRoute>
                }
              />
              <Route
                path="/merchant/businesses/:businessId/settings"
                element={
                  <RoleBasedRoute allowedRoles={['merchant']}>
                    <MerchantBusinessSettingsPage />
                  </RoleBasedRoute>
                }
              />
              <Route
                path="/merchant/api-keys"
                element={<MerchantApiKeysPage />}
              />
              <Route
                path="/merchant/developer/create-business"
                element={
                  <RoleBasedRoute allowedRoles={['merchant']}>
                    <CreateDeveloperBusinessPage />
                  </RoleBasedRoute>
                }
              />
              <Route
                path="/merchant/developer/:businessId"
                element={
                  <RoleBasedRoute allowedRoles={['merchant']}>
                    <BusinessIntegrationPage />
                  </RoleBasedRoute>
                }
              />
              <Route
                path="/merchant/developer/*"
                element={
                  <RoleBasedRoute allowedRoles={['merchant']}>
                    <MerchantDeveloperPage />
                  </RoleBasedRoute>
                }
              />
              {/* POS App Routes - Uses merchant profile directly, no businessId needed */}
              <Route
                path="/merchant/apps/pos"
                element={
                  <RoleBasedRoute allowedRoles={['merchant']}>
                    <POSAppPage />
                  </RoleBasedRoute>
                }
              />
              <Route
                path="/merchant/pos/setup"
                element={
                  <RoleBasedRoute allowedRoles={['merchant']}>
                    <POSSetupWizard />
                  </RoleBasedRoute>
                }
              />
              <Route
                path="/merchant/pos/terminal"
                element={
                  <RoleBasedRoute allowedRoles={['merchant']}>
                    <POSTerminalPage />
                  </RoleBasedRoute>
                }
              />
              <Route
                path="/merchant/pos/products"
                element={
                  <RoleBasedRoute allowedRoles={['merchant']}>
                    <POSProductsPage />
                  </RoleBasedRoute>
                }
              />
              <Route
                path="/merchant/pos/sales"
                element={
                  <RoleBasedRoute allowedRoles={['merchant']}>
                    <POSSalesPage />
                  </RoleBasedRoute>
                }
              />
              <Route
                path="/merchant/pos/reports"
                element={
                  <RoleBasedRoute allowedRoles={['merchant']}>
                    <POSReportsPage />
                  </RoleBasedRoute>
                }
              />
              <Route
                path="/merchant/pos/staff"
                element={
                  <RoleBasedRoute allowedRoles={['merchant']}>
                    <POSStaffPage />
                  </RoleBasedRoute>
                }
              />
              <Route
                path="/merchant/pos/inventory"
                element={
                  <RoleBasedRoute allowedRoles={['merchant']}>
                    <POSInventoryPage />
                  </RoleBasedRoute>
                }
              />
              <Route
                path="/merchant/pos/loyalty"
                element={
                  <RoleBasedRoute allowedRoles={['merchant']}>
                    <POSLoyaltyPage />
                  </RoleBasedRoute>
                }
              />
              <Route
                path="/merchant/pos/settings"
                element={
                  <RoleBasedRoute allowedRoles={['merchant']}>
                    <POSSettingsPage />
                  </RoleBasedRoute>
                }
              />
              <Route
                path="/merchant/pos/kitchen"
                element={
                  <RoleBasedRoute allowedRoles={['merchant']}>
                    <POSKitchenDisplayPage />
                  </RoleBasedRoute>
                }
              />
              <Route
                path="/merchant/pos/tables"
                element={
                  <RoleBasedRoute allowedRoles={['merchant']}>
                    <POSTableManagementPage />
                  </RoleBasedRoute>
                }
              />
              <Route
                path="/merchant/pos/marketplace"
                element={
                  <RoleBasedRoute allowedRoles={['merchant']}>
                    <POSMarketplacePage />
                  </RoleBasedRoute>
                }
              />
              <Route
                path="/merchant/pos/labels"
                element={
                  <RoleBasedRoute allowedRoles={['merchant']}>
                    <POSLabelsPage />
                  </RoleBasedRoute>
                }
              />
              <Route
                path="/merchant/pos/customers"
                element={
                  <RoleBasedRoute allowedRoles={['merchant']}>
                    <POSCustomersPage />
                  </RoleBasedRoute>
                }
              />
              <Route
                path="/merchant/pos/suppliers"
                element={
                  <RoleBasedRoute allowedRoles={['merchant']}>
                    <POSSuppliersPage />
                  </RoleBasedRoute>
                }
              />
              <Route
                path="/merchant/pos/discounts"
                element={
                  <RoleBasedRoute allowedRoles={['merchant']}>
                    <POSDiscountsPage />
                  </RoleBasedRoute>
                }
              />
              <Route
                path="/merchant/pos/purchase-orders"
                element={
                  <RoleBasedRoute allowedRoles={['merchant']}>
                    <POSPurchaseOrdersPage />
                  </RoleBasedRoute>
                }
              />
              <Route
                path="/merchant/pos/payment/callback"
                element={<POSPaymentCallbackPage />}
              />
              <Route
                path="/merchant/pos/receipts"
                element={
                  <RoleBasedRoute allowedRoles={['merchant']}>
                    <POSReceiptsPage />
                  </RoleBasedRoute>
                }
              />
              <Route
                path="/messages"
                element={
                  <ProtectedRoute>
                    <MessagesPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/merchant/subscriptions"
                element={
                  <RoleBasedRoute allowedRoles={['merchant']}>
                    <MerchantSubscriptionsPage />
                  </RoleBasedRoute>
                }
              />
              <Route
                path="/merchant/subscription"
                element={<Navigate to="/merchant/subscriptions" replace />}
              />
              <Route
                path="/merchant/driver-wallet"
                element={
                  <RoleBasedRoute allowedRoles={['merchant']}>
                    <DriverWalletPage />
                  </RoleBasedRoute>
                }
              />
              <Route
                path="/merchant/notifications"
                element={
                  <RoleBasedRoute allowedRoles={['merchant']}>
                    <MerchantNotificationsPage />
                  </RoleBasedRoute>
                }
              />
              {/* Events App Routes */}
              <Route
                path="/merchant/apps/events"
                element={
                  <RoleBasedRoute allowedRoles={['merchant']}>
                    <EventsAppPage />
                  </RoleBasedRoute>
                }
              />
              <Route
                path="/merchant/events/setup"
                element={
                  <RoleBasedRoute allowedRoles={['merchant']}>
                    <EventsSetupWizard />
                  </RoleBasedRoute>
                }
              />
              <Route
                path="/merchant/events"
                element={
                  <RoleBasedRoute allowedRoles={['merchant']}>
                    <EventsListPage />
                  </RoleBasedRoute>
                }
              />
              <Route
                path="/merchant/events/create"
                element={
                  <RoleBasedRoute allowedRoles={['merchant']}>
                    <EventFormPage />
                  </RoleBasedRoute>
                }
              />
              <Route
                path="/merchant/events/:eventId"
                element={
                  <RoleBasedRoute allowedRoles={['merchant']}>
                    <EventDetailsPage />
                  </RoleBasedRoute>
                }
              />
              <Route
                path="/merchant/events/:eventId/edit"
                element={
                  <RoleBasedRoute allowedRoles={['merchant']}>
                    <EventFormPage />
                  </RoleBasedRoute>
                }
              />
              <Route
                path="/merchant/events/:eventId/tickets"
                element={
                  <RoleBasedRoute allowedRoles={['merchant']}>
                    <EventTicketTypesPage />
                  </RoleBasedRoute>
                }
              />
              <Route
                path="/merchant/events/:eventId/staff"
                element={
                  <RoleBasedRoute allowedRoles={['merchant']}>
                    <EventStaffPage />
                  </RoleBasedRoute>
                }
              />
              <Route
                path="/merchant/events/:eventId/scanner"
                element={
                  <RoleBasedRoute allowedRoles={['merchant']}>
                    <EventScannerPage />
                  </RoleBasedRoute>
                }
              />
              <Route
                path="/merchant/events/:eventId/analytics"
                element={
                  <RoleBasedRoute allowedRoles={['merchant']}>
                    <EventAnalyticsPage />
                  </RoleBasedRoute>
                }
              />
              <Route
                path="/merchant/events/:eventId/wallet"
                element={
                  <RoleBasedRoute allowedRoles={['merchant']}>
                    <EventWalletPage />
                  </RoleBasedRoute>
                }
              />
              <Route
                path="/merchant/*"
                element={
                  <RoleBasedRoute allowedRoles={['merchant']}>
                    <MerchantDashboard />
                  </RoleBasedRoute>
                }
              />

              {/* Agent Routes */}
              <Route
                path="/agent"
                element={
                  <RoleBasedRoute allowedRoles={['agent']}>
                    <AgentDashboard />
                  </RoleBasedRoute>
                }
              />
              <Route
                path="/agent/settings"
                element={
                  <RoleBasedRoute allowedRoles={['agent']}>
                    <AgentSettingsPage />
                  </RoleBasedRoute>
                }
              />
              <Route
                path="/agent/transactions"
                element={
                  <RoleBasedRoute allowedRoles={['agent']}>
                    <AgentTransactionsPage />
                  </RoleBasedRoute>
                }
              />
              <Route
                path="/agent/cashout"
                element={
                  <RoleBasedRoute allowedRoles={['agent']}>
                    <AgentCashOutPage />
                  </RoleBasedRoute>
                }
              />
              <Route
                path="/agent/float"
                element={
                  <RoleBasedRoute allowedRoles={['agent']}>
                    <AgentFloatPage />
                  </RoleBasedRoute>
                }
              />
              <Route
                path="/agent/developer/*"
                element={
                  <RoleBasedRoute allowedRoles={['agent']}>
                    <AgentDeveloperPage />
                  </RoleBasedRoute>
                }
              />
              <Route
                path="/agent/*"
                element={
                  <RoleBasedRoute allowedRoles={['agent']}>
                    <AgentDashboard />
                  </RoleBasedRoute>
                }
              />

              {/* Catch-all redirect */}
              <Route path="*" element={<Navigate to="/" replace />} />
                </>
              )}

              {/* Full Mode - Show ALL routes (for local development or as fallback) */}
              {isFullMode && (
                <>
                  {/* Public routes */}
                  <Route path="/" element={<LandingPage />} />
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/register" element={<RegisterPage />} />
                  <Route path="/auth/sso" element={<SsoPage />} />
                  <Route path="/auth/authorize" element={<OAuthAuthorizePage />} />
                  <Route path="/docs" element={<ApiDocsPage />} />

                  {/* Dynamic Pages - Public pages created with page builder */}
                  <Route path="/p/:slug" element={<DynamicPage />} />

                  {/* Payment Checkout Routes (NFC/QR) */}
                  <Route path="/t/:token" element={<PaymentCheckoutPage />} />
                  <Route path="/i/:intentId" element={<PaymentIntentPage />} />
                  <Route path="/pay" element={<PayPage />} />
                  <Route path="/pay/nfc/:shortCode" element={<NFCPaymentPage />} />
                  <Route path="/pay/:businessSlug/:linkSlug" element={<PaymentLinkCheckoutPage />} />
                  <Route path="/pay/:token" element={<PaymentCheckoutPage />} />
                  <Route path="/payment/success" element={<PaymentSuccessPage />} />
                  <Route path="/payment/cancel" element={<PaymentCancelPage />} />
                  <Route path="/deposit/success" element={<DepositSuccessPage />} />
                  <Route path="/deposit/cancel" element={<DepositCancelPage />} />
                  <Route path="/checkout/:businessId" element={<BusinessCheckoutPage />} />
                  <Route path="/checkout/pay/:sessionId" element={<HostedCheckoutPage />} />
                  <Route path="/subscribe/:planId" element={<SubscriptionCheckoutPage />} />
                  <Route path="/checkout/success" element={<CheckoutSuccessPage />} />
                  <Route path="/scan-pay/:sessionId" element={<ScanPayPage />} />
                  <Route path="/app/pay/:paymentId" element={<AppPaymentRedirectPage />} />

                  {/* Onboarding Route */}
                  <Route path="/onboarding" element={<ProtectedRoute><OnboardingPage /></ProtectedRoute>} />

                  {/* Regular User Protected Routes */}
                  <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
                  <Route path="/wallets" element={<ProtectedRoute><WalletsPage /></ProtectedRoute>} />
                  <Route path="/cards" element={<ProtectedRoute><MyCardsPage /></ProtectedRoute>} />
                  <Route path="/cards/marketplace" element={<ProtectedRoute><CardMarketplacePage /></ProtectedRoute>} />
                  <Route path="/cards/legacy" element={<ProtectedRoute><CardsPage /></ProtectedRoute>} />
                  <Route path="/cards/virtual" element={<ProtectedRoute><VirtualCardsPage /></ProtectedRoute>} />
                  <Route path="/transactions" element={<ProtectedRoute><TransactionsPage /></ProtectedRoute>} />
                  <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
                  <Route path="/send" element={<ProtectedRoute><SendMoneyPage /></ProtectedRoute>} />
                  <Route path="/receive" element={<ProtectedRoute><ReceiveMoneyPage /></ProtectedRoute>} />
                  <Route path="/payout" element={<ProtectedRoute><PayoutPage /></ProtectedRoute>} />
                  <Route path="/pots" element={<ProtectedRoute><PotsPage /></ProtectedRoute>} />
                  <Route path="/pots/:potId" element={<ProtectedRoute><PotDetailPage /></ProtectedRoute>} />
                  <Route path="/bills" element={<ProtectedRoute><BillPaymentsPage /></ProtectedRoute>} />
                  <Route path="/airtime" element={<ProtectedRoute><AirtimeTopupPage /></ProtectedRoute>} />
                  <Route path="/cashback" element={<ProtectedRoute><CashbackRewardsPage /></ProtectedRoute>} />
                  <Route path="/bnpl" element={<ProtectedRoute><BnplPage /></ProtectedRoute>} />
                  <Route path="/cashout" element={<ProtectedRoute><CashOutPage /></ProtectedRoute>} />
                  <Route path="/withdraw" element={<ProtectedRoute><WithdrawPage /></ProtectedRoute>} />
                  <Route path="/analytics" element={<ProtectedRoute><SpendingAnalyticsPage /></ProtectedRoute>} />
                  {/* Settings and Cash Box */}
                  <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
                  <Route path="/cashbox/setup" element={<ProtectedRoute><CashBoxSetupWizard /></ProtectedRoute>} />
                  <Route path="/support" element={<ProtectedRoute><SupportPage /></ProtectedRoute>} />
                  <Route path="/disputes" element={<ProtectedRoute><UserDisputesPage /></ProtectedRoute>} />
                  <Route path="/verify" element={<ProtectedRoute><VerifyPage /></ProtectedRoute>} />

                  {/* Marketplace Routes */}
                  <Route path="/marketplace" element={<MarketplacePage />} />
                  <Route path="/marketplace/store/:storeSlug" element={<StorefrontPage />} />
                  <Route path="/marketplace/checkout/:storeId" element={<ProtectedRoute><MarketplaceCheckoutPage /></ProtectedRoute>} />

                  {/* Admin Routes */}
                  <Route path="/admin" element={<RoleBasedRoute allowedRoles={['admin', 'superadmin']}><AdminDashboard /></RoleBasedRoute>} />
                  <Route path="/admin/accounts" element={<RoleBasedRoute allowedRoles={['admin', 'superadmin']}><AccountsPage /></RoleBasedRoute>} />
                  <Route path="/admin/wallets" element={<RoleBasedRoute allowedRoles={['admin', 'superadmin']}><AccountsPage /></RoleBasedRoute>} />
                  <Route path="/admin/customers" element={<RoleBasedRoute allowedRoles={['admin', 'superadmin']}><CustomersPage /></RoleBasedRoute>} />
                  <Route path="/admin/cards" element={<RoleBasedRoute allowedRoles={['admin', 'superadmin']}><AdminCardsPage /></RoleBasedRoute>} />
                  <Route path="/admin/card-programs" element={<RoleBasedRoute allowedRoles={['admin', 'superadmin']}><CardProgramsPage /></RoleBasedRoute>} />
                  <Route path="/admin/card-types" element={<RoleBasedRoute allowedRoles={['admin', 'superadmin']}><CardTypesPage /></RoleBasedRoute>} />
                  <Route path="/admin/card-orders" element={<RoleBasedRoute allowedRoles={['admin', 'superadmin']}><CardOrdersPage /></RoleBasedRoute>} />
                  <Route path="/admin/virtual-cards" element={<RoleBasedRoute allowedRoles={['admin', 'superadmin']}><AdminVirtualCardsPage /></RoleBasedRoute>} />
                  <Route path="/admin/nfc-payment" element={<RoleBasedRoute allowedRoles={['admin', 'superadmin']}><AdminNFCPaymentPage /></RoleBasedRoute>} />
                  <Route path="/admin/card-products" element={<RoleBasedRoute allowedRoles={['admin', 'superadmin']}><CardProducts /></RoleBasedRoute>} />
                  <Route path="/admin/modules" element={<RoleBasedRoute allowedRoles={['admin', 'superadmin']}><Modules /></RoleBasedRoute>} />
                  <Route path="/admin/authorization" element={<RoleBasedRoute allowedRoles={['admin', 'superadmin']}><AuthorizationPage /></RoleBasedRoute>} />
                  <Route path="/admin/transactions" element={<RoleBasedRoute allowedRoles={['admin', 'superadmin']}><AdminTransactionsPage /></RoleBasedRoute>} />
                  <Route path="/admin/disputes" element={<RoleBasedRoute allowedRoles={['admin', 'superadmin']}><DisputesPage /></RoleBasedRoute>} />
                  <Route path="/admin/users" element={<RoleBasedRoute allowedRoles={['admin', 'superadmin']}><UsersManagementPage /></RoleBasedRoute>} />
                  <Route path="/admin/users/:userId" element={<RoleBasedRoute allowedRoles={['admin', 'superadmin']}><UserDetailPage /></RoleBasedRoute>} />
                  <Route path="/admin/merchants" element={<RoleBasedRoute allowedRoles={['admin', 'superadmin']}><MerchantsManagementPage /></RoleBasedRoute>} />
                  <Route path="/admin/merchants/create" element={<RoleBasedRoute allowedRoles={['admin', 'superadmin']}><CreateMerchantPage /></RoleBasedRoute>} />
                  <Route path="/admin/agents" element={<RoleBasedRoute allowedRoles={['admin', 'superadmin']}><AgentsManagementPage /></RoleBasedRoute>} />
                  <Route path="/admin/kyc-verifications" element={<RoleBasedRoute allowedRoles={['admin', 'superadmin']}><KycVerificationsPage /></RoleBasedRoute>} />
                  <Route path="/admin/fee-settings" element={<RoleBasedRoute allowedRoles={['admin', 'superadmin']}><FeeSettingsPage /></RoleBasedRoute>} />
                  <Route path="/admin/payment-settings" element={<RoleBasedRoute allowedRoles={['admin', 'superadmin']}><PaymentSettingsPage /></RoleBasedRoute>} />
                  <Route path="/admin/deposits" element={<RoleBasedRoute allowedRoles={['admin', 'superadmin']}><DepositsPage /></RoleBasedRoute>} />
                  <Route path="/admin/subscriptions" element={<RoleBasedRoute allowedRoles={['admin', 'superadmin']}><SubscriptionsPage /></RoleBasedRoute>} />
                  <Route path="/admin/nrr" element={<RoleBasedRoute allowedRoles={['admin', 'superadmin']}><NRRDashboardPage /></RoleBasedRoute>} />
                  <Route path="/admin/roles" element={<RoleBasedRoute allowedRoles={['admin', 'superadmin']}><RolesManagementPage /></RoleBasedRoute>} />
                  <Route path="/admin/pots" element={<RoleBasedRoute allowedRoles={['admin', 'superadmin']}><PotsManagementPage /></RoleBasedRoute>} />
                  <Route path="/admin/business-categories" element={<RoleBasedRoute allowedRoles={['admin', 'superadmin']}><BusinessCategoriesPage /></RoleBasedRoute>} />
                  <Route path="/admin/businesses" element={<RoleBasedRoute allowedRoles={['admin', 'superadmin']}><BusinessesPage /></RoleBasedRoute>} />
                  <Route path="/admin/businesses/:businessId" element={<RoleBasedRoute allowedRoles={['admin', 'superadmin']}><MerchantBusinessDetailPage /></RoleBasedRoute>} />
                  <Route path="/admin/webhooks" element={<RoleBasedRoute allowedRoles={['admin', 'superadmin']}><WebhooksPage /></RoleBasedRoute>} />
                  <Route path="/admin/compliance" element={<RoleBasedRoute allowedRoles={['admin', 'superadmin']}><CompliancePage /></RoleBasedRoute>} />
                  <Route path="/admin/developers" element={<RoleBasedRoute allowedRoles={['admin', 'superadmin']}><DevelopersPage /></RoleBasedRoute>} />
                  <Route path="/admin/support" element={<RoleBasedRoute allowedRoles={['admin', 'superadmin']}><SupportTicketsPage /></RoleBasedRoute>} />
                  <Route path="/admin/support-inbox" element={<RoleBasedRoute allowedRoles={['admin', 'superadmin']}><SupportInboxPage /></RoleBasedRoute>} />
                  <Route path="/admin/notifications" element={<RoleBasedRoute allowedRoles={['admin', 'superadmin']}><AdminNotificationsPage /></RoleBasedRoute>} />
                  <Route path="/admin/smtp-settings" element={<RoleBasedRoute allowedRoles={['admin', 'superadmin']}><SmtpSettingsPage /></RoleBasedRoute>} />
                  <Route path="/admin/ai-settings" element={<RoleBasedRoute allowedRoles={['admin', 'superadmin']}><AISettingsPage /></RoleBasedRoute>} />
                  <Route path="/admin/push-notifications" element={<RoleBasedRoute allowedRoles={['admin', 'superadmin']}><PushNotificationsPage /></RoleBasedRoute>} />
                  <Route path="/admin/site-settings" element={<RoleBasedRoute allowedRoles={['admin', 'superadmin']}><SiteSettingsPage /></RoleBasedRoute>} />
                  <Route path="/admin/settings/sso" element={<RoleBasedRoute allowedRoles={['admin', 'superadmin']}><SsoSettingsPage /></RoleBasedRoute>} />
                  <Route path="/admin/analytics" element={<RoleBasedRoute allowedRoles={['admin', 'superadmin']}><WebsiteAnalyticsPage /></RoleBasedRoute>} />
                  <Route path="/admin/exchange-rates" element={<RoleBasedRoute allowedRoles={['admin', 'superadmin']}><ExchangeRatesPage /></RoleBasedRoute>} />
                  {/* Pages Management Routes */}
                  <Route path="/admin/pages" element={<RoleBasedRoute allowedRoles={['admin', 'superadmin']}><PagesManagementPage /></RoleBasedRoute>} />
                  <Route path="/admin/pages/:pageId/edit" element={<RoleBasedRoute allowedRoles={['admin', 'superadmin']}><PageEditorPage /></RoleBasedRoute>} />
                  {/* Transport Routes */}
                  <Route path="/admin/drivers" element={<RoleBasedRoute allowedRoles={['admin', 'superadmin']}><DriversPage /></RoleBasedRoute>} />
                  <Route path="/admin/fuel-stations" element={<RoleBasedRoute allowedRoles={['admin', 'superadmin']}><FuelStationsPage /></RoleBasedRoute>} />

                  {/* User Notifications Route */}
                  <Route path="/notifications" element={<ProtectedRoute><UserNotificationsPage /></ProtectedRoute>} />

                  {/* Messages Route */}
                  <Route path="/messages" element={<ProtectedRoute><MessagesPage /></ProtectedRoute>} />

                  {/* Staff POS Route - For users who are staff at a merchant's POS */}
                  <Route path="/dashboard/pos" element={<ProtectedRoute><StaffPOSPage /></ProtectedRoute>} />

                  {/* User Events Routes */}
                  <Route path="/events" element={<ProtectedRoute><UserEventsPage /></ProtectedRoute>} />
                  <Route path="/events/:eventId" element={<ProtectedRoute><UserEventDetailPage /></ProtectedRoute>} />
                  <Route path="/my-tickets" element={<ProtectedRoute><MyTicketsPage /></ProtectedRoute>} />
                  <Route path="/staff-events/:eventId/scan" element={<ProtectedRoute><StaffEventScannerPage /></ProtectedRoute>} />
                  {/* Ticket validation - redirects from Scan to Pay when event ticket detected */}
                  <Route path="/events/:eventId/validate/:ticketNumber" element={<ProtectedRoute><StaffEventScannerPage /></ProtectedRoute>} />

                  {/* Merchant Routes */}
                  <Route path="/merchant" element={<RoleBasedRoute allowedRoles={['merchant']}><MerchantDashboard /></RoleBasedRoute>} />
                  <Route path="/merchant/transactions" element={<RoleBasedRoute allowedRoles={['merchant']}><MerchantTransactionsPage /></RoleBasedRoute>} />
                  <Route path="/merchant/payouts" element={<RoleBasedRoute allowedRoles={['merchant']}><MerchantPayoutsPage /></RoleBasedRoute>} />
                  <Route path="/merchant/refunds" element={<RoleBasedRoute allowedRoles={['merchant']}><MerchantRefundsPage /></RoleBasedRoute>} />
                  <Route path="/merchant/reports" element={<RoleBasedRoute allowedRoles={['merchant']}><MerchantReportsPage /></RoleBasedRoute>} />
                  <Route path="/merchant/statements" element={<RoleBasedRoute allowedRoles={['merchant']}><MerchantStatementPage /></RoleBasedRoute>} />
                  <Route path="/merchant/payment-links" element={<RoleBasedRoute allowedRoles={['merchant']}><MerchantPaymentLinksPage /></RoleBasedRoute>} />
                  <Route path="/merchant/invoices" element={<RoleBasedRoute allowedRoles={['merchant']}><MerchantInvoicesPage /></RoleBasedRoute>} />
                  <Route path="/merchant/invoices/new" element={<RoleBasedRoute allowedRoles={['merchant']}><NewInvoicePage /></RoleBasedRoute>} />
                  <Route path="/merchant/invoices/settings" element={<RoleBasedRoute allowedRoles={['merchant']}><InvoiceSettingsPage /></RoleBasedRoute>} />
                  <Route path="/merchant/invoices/:invoiceId" element={<RoleBasedRoute allowedRoles={['merchant']}><InvoiceDetailsPage /></RoleBasedRoute>} />
                  <Route path="/merchant/subscriptions" element={<RoleBasedRoute allowedRoles={['merchant']}><MerchantSubscriptionsPage /></RoleBasedRoute>} />
                  <Route path="/merchant/apps" element={<RoleBasedRoute allowedRoles={['merchant']}><AppSubscriptionPage /></RoleBasedRoute>} />
                  <Route path="/merchant/profile" element={<RoleBasedRoute allowedRoles={['merchant']}><MerchantProfilePage /></RoleBasedRoute>} />
                  <Route path="/merchant/create-business" element={<RoleBasedRoute allowedRoles={['merchant']}><CreateBusinessPage /></RoleBasedRoute>} />
                  <Route path="/merchant/settings" element={<RoleBasedRoute allowedRoles={['merchant']}><MerchantSettingsPage /></RoleBasedRoute>} />
                  <Route path="/merchant/support" element={<RoleBasedRoute allowedRoles={['merchant']}><MerchantSupportPage /></RoleBasedRoute>} />
                  <Route path="/merchant/notifications" element={<RoleBasedRoute allowedRoles={['merchant']}><MerchantNotificationsPage /></RoleBasedRoute>} />
                  <Route path="/merchant/businesses" element={<RoleBasedRoute allowedRoles={['merchant']}><MerchantBusinessesPage /></RoleBasedRoute>} />
                  <Route path="/merchant/collect-payment" element={<RoleBasedRoute allowedRoles={['merchant']}><CollectPaymentPage /></RoleBasedRoute>} />
                  <Route path="/merchant/driver-wallet" element={<RoleBasedRoute allowedRoles={['merchant']}><DriverWalletPage /></RoleBasedRoute>} />
                  <Route path="/merchant/terminal" element={<RoleBasedRoute allowedRoles={['merchant']}><MerchantPaymentTerminalPage /></RoleBasedRoute>} />
                  <Route path="/merchant/upgrade" element={<RoleBasedRoute allowedRoles={['merchant']}><MerchantUpgradePage /></RoleBasedRoute>} />
                  <Route path="/merchant/subscription" element={<Navigate to="/merchant/subscriptions" replace />} />
                  <Route path="/merchant/businesses/:businessId" element={<RoleBasedRoute allowedRoles={['merchant']}><MerchantBusinessDetailPage /></RoleBasedRoute>} />
                  <Route path="/merchant/businesses/:businessId/transactions" element={<RoleBasedRoute allowedRoles={['merchant']}><MerchantBusinessTransactionsPage /></RoleBasedRoute>} />
                  <Route path="/merchant/businesses/:businessId/disputes" element={<RoleBasedRoute allowedRoles={['merchant']}><MerchantBusinessDisputesPage /></RoleBasedRoute>} />
                  <Route path="/merchant/businesses/:businessId/settings" element={<RoleBasedRoute allowedRoles={['merchant']}><MerchantBusinessSettingsPage /></RoleBasedRoute>} />
                  <Route path="/merchant/api-keys" element={<MerchantApiKeysPage />} />
                  <Route path="/merchant/developer/create-business" element={<RoleBasedRoute allowedRoles={['merchant']}><CreateDeveloperBusinessPage /></RoleBasedRoute>} />
                  <Route path="/merchant/developer/:businessId" element={<RoleBasedRoute allowedRoles={['merchant']}><BusinessIntegrationPage /></RoleBasedRoute>} />
                  <Route path="/merchant/developer/*" element={<RoleBasedRoute allowedRoles={['merchant']}><MerchantDeveloperPage /></RoleBasedRoute>} />
                  {/* POS App Routes */}
                  <Route path="/merchant/apps/pos" element={<RoleBasedRoute allowedRoles={['merchant']}><POSAppPage /></RoleBasedRoute>} />
                  <Route path="/merchant/pos/setup" element={<RoleBasedRoute allowedRoles={['merchant']}><POSSetupWizard /></RoleBasedRoute>} />
                  <Route path="/merchant/pos/terminal" element={<RoleBasedRoute allowedRoles={['merchant']}><POSTerminalPage /></RoleBasedRoute>} />
                  <Route path="/merchant/pos/products" element={<RoleBasedRoute allowedRoles={['merchant']}><POSProductsPage /></RoleBasedRoute>} />
                  <Route path="/merchant/pos/labels" element={<RoleBasedRoute allowedRoles={['merchant']}><POSLabelsPage /></RoleBasedRoute>} />
                  <Route path="/merchant/pos/sales" element={<RoleBasedRoute allowedRoles={['merchant']}><POSSalesPage /></RoleBasedRoute>} />
                  <Route path="/merchant/pos/reports" element={<RoleBasedRoute allowedRoles={['merchant']}><POSReportsPage /></RoleBasedRoute>} />
                  <Route path="/merchant/pos/staff" element={<RoleBasedRoute allowedRoles={['merchant']}><POSStaffPage /></RoleBasedRoute>} />
                  <Route path="/merchant/pos/inventory" element={<RoleBasedRoute allowedRoles={['merchant']}><POSInventoryPage /></RoleBasedRoute>} />
                  <Route path="/merchant/pos/loyalty" element={<RoleBasedRoute allowedRoles={['merchant']}><POSLoyaltyPage /></RoleBasedRoute>} />
                  <Route path="/merchant/pos/settings" element={<RoleBasedRoute allowedRoles={['merchant']}><POSSettingsPage /></RoleBasedRoute>} />
                  <Route path="/merchant/pos/kitchen" element={<RoleBasedRoute allowedRoles={['merchant']}><POSKitchenDisplayPage /></RoleBasedRoute>} />
                  <Route path="/merchant/pos/display" element={<POSCustomerDisplayPage />} />
                  <Route path="/merchant/pos/tables" element={<RoleBasedRoute allowedRoles={['merchant']}><POSTableManagementPage /></RoleBasedRoute>} />
                  <Route path="/merchant/pos/customers" element={<RoleBasedRoute allowedRoles={['merchant']}><POSCustomersPage /></RoleBasedRoute>} />
                  <Route path="/merchant/pos/suppliers" element={<RoleBasedRoute allowedRoles={['merchant']}><POSSuppliersPage /></RoleBasedRoute>} />
                  <Route path="/merchant/pos/discounts" element={<RoleBasedRoute allowedRoles={['merchant']}><POSDiscountsPage /></RoleBasedRoute>} />
                  <Route path="/merchant/pos/purchase-orders" element={<RoleBasedRoute allowedRoles={['merchant']}><POSPurchaseOrdersPage /></RoleBasedRoute>} />
                  <Route path="/merchant/pos/marketplace" element={<RoleBasedRoute allowedRoles={['merchant']}><POSMarketplacePage /></RoleBasedRoute>} />
                  <Route path="/merchant/pos/payment/callback" element={<POSPaymentCallbackPage />} />
                  <Route path="/merchant/pos/receipts" element={<RoleBasedRoute allowedRoles={['merchant']}><POSReceiptsPage /></RoleBasedRoute>} />
                  {/* Events App Routes */}
                  <Route path="/merchant/apps/events" element={<RoleBasedRoute allowedRoles={['merchant']}><EventsAppPage /></RoleBasedRoute>} />
                  <Route path="/merchant/events/setup" element={<RoleBasedRoute allowedRoles={['merchant']}><EventsSetupWizard /></RoleBasedRoute>} />
                  <Route path="/merchant/events" element={<RoleBasedRoute allowedRoles={['merchant']}><EventsListPage /></RoleBasedRoute>} />
                  <Route path="/merchant/events/create" element={<RoleBasedRoute allowedRoles={['merchant']}><EventFormPage /></RoleBasedRoute>} />
                  <Route path="/merchant/events/:eventId" element={<RoleBasedRoute allowedRoles={['merchant']}><EventDetailsPage /></RoleBasedRoute>} />
                  <Route path="/merchant/events/:eventId/edit" element={<RoleBasedRoute allowedRoles={['merchant']}><EventFormPage /></RoleBasedRoute>} />
                  <Route path="/merchant/events/:eventId/tickets" element={<RoleBasedRoute allowedRoles={['merchant']}><EventTicketTypesPage /></RoleBasedRoute>} />
                  <Route path="/merchant/events/:eventId/staff" element={<RoleBasedRoute allowedRoles={['merchant']}><EventStaffPage /></RoleBasedRoute>} />
                  <Route path="/merchant/events/:eventId/scanner" element={<RoleBasedRoute allowedRoles={['merchant']}><EventScannerPage /></RoleBasedRoute>} />
                  <Route path="/merchant/events/:eventId/analytics" element={<RoleBasedRoute allowedRoles={['merchant']}><EventAnalyticsPage /></RoleBasedRoute>} />
                  <Route path="/merchant/events/:eventId/wallet" element={<RoleBasedRoute allowedRoles={['merchant']}><EventWalletPage /></RoleBasedRoute>} />
                  <Route path="/merchant/*" element={<RoleBasedRoute allowedRoles={['merchant']}><MerchantDashboard /></RoleBasedRoute>} />

                  {/* Agent Routes */}
                  <Route path="/agent" element={<RoleBasedRoute allowedRoles={['agent']}><AgentDashboard /></RoleBasedRoute>} />
                  <Route path="/agent/settings" element={<RoleBasedRoute allowedRoles={['agent']}><AgentSettingsPage /></RoleBasedRoute>} />
                  <Route path="/agent/transactions" element={<RoleBasedRoute allowedRoles={['agent']}><AgentTransactionsPage /></RoleBasedRoute>} />
                  <Route path="/agent/cashout" element={<RoleBasedRoute allowedRoles={['agent']}><AgentCashOutPage /></RoleBasedRoute>} />
                  <Route path="/agent/float" element={<RoleBasedRoute allowedRoles={['agent']}><AgentFloatPage /></RoleBasedRoute>} />
                  <Route path="/agent/notifications" element={<RoleBasedRoute allowedRoles={['agent']}><AgentNotificationsPage /></RoleBasedRoute>} />
                  <Route path="/agent/developer/*" element={<RoleBasedRoute allowedRoles={['agent']}><AgentDeveloperPage /></RoleBasedRoute>} />
                  <Route path="/agent/*" element={<RoleBasedRoute allowedRoles={['agent']}><AgentDashboard /></RoleBasedRoute>} />

                  {/* Catch-all - 404 Not Found */}
                  <Route path="*" element={<NotFoundPage />} />
                </>
              )}

              {/* Global 404 fallback for all modes */}
              <Route path="*" element={<NotFoundPage />} />
                </Routes>
                </POSAppGuard>
                <AIChatbot />
                      </BusinessProvider>
                    </UserAppsProvider>
                </AppsProvider>
                </DeveloperModeProvider>
              </NotificationProvider>
              </NFCProvider>
              </InactivityTracker>
              </ThemeColorProvider>
            </AuthProvider>
          </BrowserRouter>
        </ThemeProvider>
      </QueryClientProvider>
      </HelmetProvider>
    </ErrorBoundary>
  );
}

export default App;
