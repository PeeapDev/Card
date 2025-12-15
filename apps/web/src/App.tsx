import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/context/AuthContext';
import { NFCProvider } from '@/hooks/useNFC';
import { DeveloperModeProvider } from '@/context/DeveloperModeContext';
import { AppsProvider } from '@/context/AppsContext';
import { NotificationProvider } from '@/context/NotificationContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { NotificationWrapper } from '@/components/ui/NotificationWrapper';
import { AnalyticsTracker } from '@/components/AnalyticsTracker';
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
import Modules from '@/pages/admin/Modules';
import CardProducts from '@/pages/admin/CardProducts';
import { DevelopersPage } from '@/pages/admin/DevelopersPage';
import { UsersManagementPage } from '@/pages/admin/UsersManagementPage';
import { UserDetailPage } from '@/pages/admin/UserDetailPage';
import { MerchantsManagementPage } from '@/pages/admin/MerchantsManagementPage';
import { CreateMerchantPage } from '@/pages/admin/CreateMerchantPage';
import { AgentsManagementPage } from '@/pages/admin/AgentsManagementPage';
import { FeesPage } from '@/pages/admin/FeesPage';
import { FeeSettingsPage } from '@/pages/admin/FeeSettingsPage';
import { PaymentSettingsPage } from '@/pages/admin/PaymentSettingsPage';
import { DepositsPage } from '@/pages/admin/DepositsPage';
import { SubscriptionsPage } from '@/pages/admin/SubscriptionsPage';
import { RolesManagementPage } from '@/pages/admin/RolesManagementPage';
import { PotsManagementPage } from '@/pages/admin/PotsManagementPage';
import { BusinessCategoriesPage } from '@/pages/admin/BusinessCategoriesPage';
import { BusinessesPage } from '@/pages/admin/BusinessesPage';
import { BusinessDetailPage } from '@/pages/admin/BusinessDetailPage';
import { SupportTicketsPage } from '@/pages/admin/SupportTicketsPage';
import { AdminNotificationsPage } from '@/pages/admin/AdminNotificationsPage';
import { SmtpSettingsPage } from '@/pages/admin/SmtpSettingsPage';
import SsoSettingsPage from '@/pages/admin/SsoSettingsPage';
import { WebsiteAnalyticsPage } from '@/pages/admin/WebsiteAnalyticsPage';
import { PaymentCheckoutPage } from '@/pages/PaymentCheckoutPage';
import { PayPage } from '@/pages/PayPage';
import { PaymentSuccessPage } from '@/pages/PaymentSuccessPage';
import { PaymentCancelPage } from '@/pages/PaymentCancelPage';
import { DepositSuccessPage } from '@/pages/DepositSuccessPage';
import { DepositCancelPage } from '@/pages/DepositCancelPage';
import { BusinessCheckoutPage } from '@/pages/BusinessCheckoutPage';
import { CheckoutPage } from '@/pages/CheckoutPage';
import { HostedCheckoutPage } from '@/pages/HostedCheckoutPage';
import { SubscriptionCheckoutPage } from '@/pages/SubscriptionCheckoutPage';
import { CheckoutSuccessPage } from '@/pages/CheckoutSuccessPage';
import { ScanPayPage } from '@/pages/ScanPayPage';
import { TestCheckoutPage } from '@/pages/TestCheckoutPage';
import { AppPaymentRedirectPage } from '@/pages/AppPaymentRedirectPage';
import { NFCPaymentPage } from '@/pages/NFCPaymentPage';
import { OnboardingPage } from '@/pages/OnboardingPage';

// Merchant Pages
import { MerchantDashboard } from '@/pages/merchant/MerchantDashboard';
import { MerchantSettingsPage } from '@/pages/merchant/MerchantSettingsPage';
import { MerchantDeveloperPage } from '@/pages/merchant/MerchantDeveloperPage';
import { BusinessIntegrationPage } from '@/pages/merchant/BusinessIntegrationPage';
import { MerchantTransactionsPage } from '@/pages/merchant/MerchantTransactionsPage';
import { MerchantPayoutsPage } from '@/pages/merchant/MerchantPayoutsPage';
import { MerchantRefundsPage } from '@/pages/merchant/MerchantRefundsPage';
import { MerchantReportsPage } from '@/pages/merchant/MerchantReportsPage';
import { MerchantPaymentLinksPage } from '@/pages/merchant/MerchantPaymentLinksPage';
import { MerchantSubscriptionsPage } from '@/pages/merchant/MerchantSubscriptionsPage';
import { MerchantProfilePage } from '@/pages/merchant/MerchantProfilePage';
import { CreateBusinessPage } from '@/pages/merchant/CreateBusinessPage';
import { CreateDeveloperBusinessPage } from '@/pages/merchant/CreateDeveloperBusinessPage';
import { MerchantShopsPage } from '@/pages/merchant/MerchantShopsPage';
import { MerchantUpgradePage } from '@/pages/merchant/MerchantUpgradePage';
import { MerchantSubscriptionPage } from '@/pages/merchant/MerchantSubscriptionPage';
import { CollectPaymentPage } from '@/pages/merchant/CollectPaymentPage';
import { DriverWalletPage } from '@/pages/merchant/DriverWalletPage';
import { ShopDetailPage } from '@/pages/merchant/ShopDetailPage';
import { ShopTransactionsPage } from '@/pages/merchant/ShopTransactionsPage';
import { ShopDisputesPage } from '@/pages/merchant/ShopDisputesPage';
import { ShopSettingsPage } from '@/pages/merchant/ShopSettingsPage';
import { MerchantSupportPage } from '@/pages/merchant/MerchantSupportPage';
import { MerchantNotificationsPage } from '@/pages/merchant/MerchantNotificationsPage';
// POS Pages
import { POSTerminalPage, POSProductsPage, POSSalesPage, POSSetupWizard, POSReportsPage, POSStaffPage, POSInventoryPage, POSLoyaltyPage, POSSettingsPage, POSKitchenDisplayPage, POSTableManagementPage, POSCustomersPage, POSSuppliersPage, POSDiscountsPage, POSPurchaseOrdersPage } from '@/pages/merchant/pos';
import { POSAppPage } from '@/pages/merchant/apps/POSAppPage';
// User Notifications
import { UserNotificationsPage } from '@/pages/UserNotificationsPage';
// Staff POS
import StaffPOSPage from '@/pages/user/StaffPOSPage';
// Agent Pages
import { AgentDashboard } from '@/pages/agent/AgentDashboard';
import { AgentNotificationsPage } from '@/pages/agent/AgentNotificationsPage';
import { AgentSettingsPage } from '@/pages/agent/AgentSettingsPage';
import { AgentDeveloperPage } from '@/pages/agent/AgentDeveloperPage';
import { AgentTransactionsPage } from '@/pages/agent/AgentTransactionsPage';
import { AgentCashOutPage } from '@/pages/agent/AgentCashOutPage';
import { AgentFloatPage } from '@/pages/agent/AgentFloatPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
});

// Get the app mode from environment variable
const APP_MODE = import.meta.env.VITE_APP_MODE || 'full'; // 'checkout', 'merchant', or 'full'

// Debug log for troubleshooting

function App() {
  // Determine which routes to show
  const isCheckoutMode = APP_MODE === 'checkout';
  const isMerchantMode = APP_MODE === 'merchant';
  const isFullMode = APP_MODE === 'full' || (!isCheckoutMode && !isMerchantMode); // Fallback to full if mode is invalid

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <BrowserRouter>
            <AuthProvider>
              <NFCProvider>
              <NotificationProvider>
                <DeveloperModeProvider>
                  <AppsProvider>
                  <NotificationWrapper />
                  <AnalyticsTracker />
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
                  <Route path="/pay/:token" element={<PaymentCheckoutPage />} />

                  {/* Payment Link Route (query params) */}
                  <Route path="/pay" element={<PayPage />} />

                  {/* Secure NFC Payment Route */}
                  <Route path="/pay/nfc/:shortCode" element={<NFCPaymentPage />} />

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

                  {/* Payment Checkout Routes (Public - for QR scans) */}
                  <Route path="/scan-pay/:sessionId" element={<ScanPayPage />} />
                  <Route path="/checkout/pay/:sessionId" element={<HostedCheckoutPage />} />
                  <Route path="/checkout/:businessId" element={<BusinessCheckoutPage />} />
                  <Route path="/checkout/success" element={<CheckoutSuccessPage />} />
                  <Route path="/t/:token" element={<PaymentCheckoutPage />} />
                  <Route path="/pay/:token" element={<PaymentCheckoutPage />} />
                  <Route path="/pay" element={<PayPage />} />
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
              {/* Staff POS Route - For users who are staff at a merchant's POS */}
              <Route
                path="/dashboard/pos"
                element={
                  <ProtectedRoute>
                    <StaffPOSPage />
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
                path="/admin/fees"
                element={
                  <RoleBasedRoute allowedRoles={['admin', 'superadmin']}>
                    <FeesPage />
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
                    <BusinessDetailPage />
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
                path="/admin/settings/sso"
                element={
                  <RoleBasedRoute allowedRoles={['admin', 'superadmin']}>
                    <SsoSettingsPage />
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
                path="/merchant/shops"
                element={
                  <RoleBasedRoute allowedRoles={['merchant']}>
                    <MerchantShopsPage />
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
                path="/merchant/shops/:businessId"
                element={
                  <RoleBasedRoute allowedRoles={['merchant']}>
                    <ShopDetailPage />
                  </RoleBasedRoute>
                }
              />
              <Route
                path="/merchant/shops/:businessId/transactions"
                element={
                  <RoleBasedRoute allowedRoles={['merchant']}>
                    <ShopTransactionsPage />
                  </RoleBasedRoute>
                }
              />
              <Route
                path="/merchant/shops/:businessId/disputes"
                element={
                  <RoleBasedRoute allowedRoles={['merchant']}>
                    <ShopDisputesPage />
                  </RoleBasedRoute>
                }
              />
              <Route
                path="/merchant/shops/:businessId/settings"
                element={
                  <RoleBasedRoute allowedRoles={['merchant']}>
                    <ShopSettingsPage />
                  </RoleBasedRoute>
                }
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
                path="/merchant/subscriptions"
                element={
                  <RoleBasedRoute allowedRoles={['merchant']}>
                    <MerchantSubscriptionsPage />
                  </RoleBasedRoute>
                }
              />
              <Route
                path="/merchant/subscription"
                element={
                  <RoleBasedRoute allowedRoles={['merchant']}>
                    <MerchantSubscriptionPage />
                  </RoleBasedRoute>
                }
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

                  {/* Payment Checkout Routes (NFC/QR) */}
                  <Route path="/t/:token" element={<PaymentCheckoutPage />} />
                  <Route path="/pay/:token" element={<PaymentCheckoutPage />} />
                  <Route path="/pay" element={<PayPage />} />
                  <Route path="/pay/nfc/:shortCode" element={<NFCPaymentPage />} />
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

                  {/* Admin Routes */}
                  <Route path="/admin" element={<RoleBasedRoute allowedRoles={['admin', 'superadmin']}><AdminDashboard /></RoleBasedRoute>} />
                  <Route path="/admin/accounts" element={<RoleBasedRoute allowedRoles={['admin', 'superadmin']}><AccountsPage /></RoleBasedRoute>} />
                  <Route path="/admin/customers" element={<RoleBasedRoute allowedRoles={['admin', 'superadmin']}><CustomersPage /></RoleBasedRoute>} />
                  <Route path="/admin/cards" element={<RoleBasedRoute allowedRoles={['admin', 'superadmin']}><AdminCardsPage /></RoleBasedRoute>} />
                  <Route path="/admin/card-programs" element={<RoleBasedRoute allowedRoles={['admin', 'superadmin']}><CardProgramsPage /></RoleBasedRoute>} />
                  <Route path="/admin/card-types" element={<RoleBasedRoute allowedRoles={['admin', 'superadmin']}><CardTypesPage /></RoleBasedRoute>} />
                  <Route path="/admin/card-orders" element={<RoleBasedRoute allowedRoles={['admin', 'superadmin']}><CardOrdersPage /></RoleBasedRoute>} />
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
                  <Route path="/admin/fees" element={<RoleBasedRoute allowedRoles={['admin', 'superadmin']}><FeesPage /></RoleBasedRoute>} />
                  <Route path="/admin/fee-settings" element={<RoleBasedRoute allowedRoles={['admin', 'superadmin']}><FeeSettingsPage /></RoleBasedRoute>} />
                  <Route path="/admin/payment-settings" element={<RoleBasedRoute allowedRoles={['admin', 'superadmin']}><PaymentSettingsPage /></RoleBasedRoute>} />
                  <Route path="/admin/deposits" element={<RoleBasedRoute allowedRoles={['admin', 'superadmin']}><DepositsPage /></RoleBasedRoute>} />
                  <Route path="/admin/subscriptions" element={<RoleBasedRoute allowedRoles={['admin', 'superadmin']}><SubscriptionsPage /></RoleBasedRoute>} />
                  <Route path="/admin/roles" element={<RoleBasedRoute allowedRoles={['admin', 'superadmin']}><RolesManagementPage /></RoleBasedRoute>} />
                  <Route path="/admin/pots" element={<RoleBasedRoute allowedRoles={['admin', 'superadmin']}><PotsManagementPage /></RoleBasedRoute>} />
                  <Route path="/admin/business-categories" element={<RoleBasedRoute allowedRoles={['admin', 'superadmin']}><BusinessCategoriesPage /></RoleBasedRoute>} />
                  <Route path="/admin/businesses" element={<RoleBasedRoute allowedRoles={['admin', 'superadmin']}><BusinessesPage /></RoleBasedRoute>} />
                  <Route path="/admin/businesses/:businessId" element={<RoleBasedRoute allowedRoles={['admin', 'superadmin']}><BusinessDetailPage /></RoleBasedRoute>} />
                  <Route path="/admin/webhooks" element={<RoleBasedRoute allowedRoles={['admin', 'superadmin']}><WebhooksPage /></RoleBasedRoute>} />
                  <Route path="/admin/compliance" element={<RoleBasedRoute allowedRoles={['admin', 'superadmin']}><CompliancePage /></RoleBasedRoute>} />
                  <Route path="/admin/developers" element={<RoleBasedRoute allowedRoles={['admin', 'superadmin']}><DevelopersPage /></RoleBasedRoute>} />
                  <Route path="/admin/support" element={<RoleBasedRoute allowedRoles={['admin', 'superadmin']}><SupportTicketsPage /></RoleBasedRoute>} />
                  <Route path="/admin/notifications" element={<RoleBasedRoute allowedRoles={['admin', 'superadmin']}><AdminNotificationsPage /></RoleBasedRoute>} />
                  <Route path="/admin/smtp-settings" element={<RoleBasedRoute allowedRoles={['admin', 'superadmin']}><SmtpSettingsPage /></RoleBasedRoute>} />
                  <Route path="/admin/settings/sso" element={<RoleBasedRoute allowedRoles={['admin', 'superadmin']}><SsoSettingsPage /></RoleBasedRoute>} />
                  <Route path="/admin/analytics" element={<RoleBasedRoute allowedRoles={['admin', 'superadmin']}><WebsiteAnalyticsPage /></RoleBasedRoute>} />

                  {/* User Notifications Route */}
                  <Route path="/notifications" element={<ProtectedRoute><UserNotificationsPage /></ProtectedRoute>} />

                  {/* Staff POS Route - For users who are staff at a merchant's POS */}
                  <Route path="/dashboard/pos" element={<ProtectedRoute><StaffPOSPage /></ProtectedRoute>} />

                  {/* Merchant Routes */}
                  <Route path="/merchant" element={<RoleBasedRoute allowedRoles={['merchant']}><MerchantDashboard /></RoleBasedRoute>} />
                  <Route path="/merchant/transactions" element={<RoleBasedRoute allowedRoles={['merchant']}><MerchantTransactionsPage /></RoleBasedRoute>} />
                  <Route path="/merchant/payouts" element={<RoleBasedRoute allowedRoles={['merchant']}><MerchantPayoutsPage /></RoleBasedRoute>} />
                  <Route path="/merchant/refunds" element={<RoleBasedRoute allowedRoles={['merchant']}><MerchantRefundsPage /></RoleBasedRoute>} />
                  <Route path="/merchant/reports" element={<RoleBasedRoute allowedRoles={['merchant']}><MerchantReportsPage /></RoleBasedRoute>} />
                  <Route path="/merchant/payment-links" element={<RoleBasedRoute allowedRoles={['merchant']}><MerchantPaymentLinksPage /></RoleBasedRoute>} />
                  <Route path="/merchant/subscriptions" element={<RoleBasedRoute allowedRoles={['merchant']}><MerchantSubscriptionsPage /></RoleBasedRoute>} />
                  <Route path="/merchant/profile" element={<RoleBasedRoute allowedRoles={['merchant']}><MerchantProfilePage /></RoleBasedRoute>} />
                  <Route path="/merchant/create-business" element={<RoleBasedRoute allowedRoles={['merchant']}><CreateBusinessPage /></RoleBasedRoute>} />
                  <Route path="/merchant/settings" element={<RoleBasedRoute allowedRoles={['merchant']}><MerchantSettingsPage /></RoleBasedRoute>} />
                  <Route path="/merchant/support" element={<RoleBasedRoute allowedRoles={['merchant']}><MerchantSupportPage /></RoleBasedRoute>} />
                  <Route path="/merchant/notifications" element={<RoleBasedRoute allowedRoles={['merchant']}><MerchantNotificationsPage /></RoleBasedRoute>} />
                  <Route path="/merchant/shops" element={<RoleBasedRoute allowedRoles={['merchant']}><MerchantShopsPage /></RoleBasedRoute>} />
                  <Route path="/merchant/collect-payment" element={<RoleBasedRoute allowedRoles={['merchant']}><CollectPaymentPage /></RoleBasedRoute>} />
                  <Route path="/merchant/driver-wallet" element={<RoleBasedRoute allowedRoles={['merchant']}><DriverWalletPage /></RoleBasedRoute>} />
                  <Route path="/merchant/upgrade" element={<RoleBasedRoute allowedRoles={['merchant']}><MerchantUpgradePage /></RoleBasedRoute>} />
                  <Route path="/merchant/subscription" element={<RoleBasedRoute allowedRoles={['merchant']}><MerchantSubscriptionPage /></RoleBasedRoute>} />
                  <Route path="/merchant/shops/:businessId" element={<RoleBasedRoute allowedRoles={['merchant']}><ShopDetailPage /></RoleBasedRoute>} />
                  <Route path="/merchant/shops/:businessId/transactions" element={<RoleBasedRoute allowedRoles={['merchant']}><ShopTransactionsPage /></RoleBasedRoute>} />
                  <Route path="/merchant/shops/:businessId/disputes" element={<RoleBasedRoute allowedRoles={['merchant']}><ShopDisputesPage /></RoleBasedRoute>} />
                  <Route path="/merchant/shops/:businessId/settings" element={<RoleBasedRoute allowedRoles={['merchant']}><ShopSettingsPage /></RoleBasedRoute>} />
                  <Route path="/merchant/developer/create-business" element={<RoleBasedRoute allowedRoles={['merchant']}><CreateDeveloperBusinessPage /></RoleBasedRoute>} />
                  <Route path="/merchant/developer/:businessId" element={<RoleBasedRoute allowedRoles={['merchant']}><BusinessIntegrationPage /></RoleBasedRoute>} />
                  <Route path="/merchant/developer/*" element={<RoleBasedRoute allowedRoles={['merchant']}><MerchantDeveloperPage /></RoleBasedRoute>} />
                  {/* POS App Routes */}
                  <Route path="/merchant/apps/pos" element={<RoleBasedRoute allowedRoles={['merchant']}><POSAppPage /></RoleBasedRoute>} />
                  <Route path="/merchant/pos/setup" element={<RoleBasedRoute allowedRoles={['merchant']}><POSSetupWizard /></RoleBasedRoute>} />
                  <Route path="/merchant/pos/terminal" element={<RoleBasedRoute allowedRoles={['merchant']}><POSTerminalPage /></RoleBasedRoute>} />
                  <Route path="/merchant/pos/products" element={<RoleBasedRoute allowedRoles={['merchant']}><POSProductsPage /></RoleBasedRoute>} />
                  <Route path="/merchant/pos/sales" element={<RoleBasedRoute allowedRoles={['merchant']}><POSSalesPage /></RoleBasedRoute>} />
                  <Route path="/merchant/pos/reports" element={<RoleBasedRoute allowedRoles={['merchant']}><POSReportsPage /></RoleBasedRoute>} />
                  <Route path="/merchant/pos/staff" element={<RoleBasedRoute allowedRoles={['merchant']}><POSStaffPage /></RoleBasedRoute>} />
                  <Route path="/merchant/pos/inventory" element={<RoleBasedRoute allowedRoles={['merchant']}><POSInventoryPage /></RoleBasedRoute>} />
                  <Route path="/merchant/pos/loyalty" element={<RoleBasedRoute allowedRoles={['merchant']}><POSLoyaltyPage /></RoleBasedRoute>} />
                  <Route path="/merchant/pos/settings" element={<RoleBasedRoute allowedRoles={['merchant']}><POSSettingsPage /></RoleBasedRoute>} />
                  <Route path="/merchant/pos/kitchen" element={<RoleBasedRoute allowedRoles={['merchant']}><POSKitchenDisplayPage /></RoleBasedRoute>} />
                  <Route path="/merchant/pos/tables" element={<RoleBasedRoute allowedRoles={['merchant']}><POSTableManagementPage /></RoleBasedRoute>} />
                  <Route path="/merchant/pos/customers" element={<RoleBasedRoute allowedRoles={['merchant']}><POSCustomersPage /></RoleBasedRoute>} />
                  <Route path="/merchant/pos/suppliers" element={<RoleBasedRoute allowedRoles={['merchant']}><POSSuppliersPage /></RoleBasedRoute>} />
                  <Route path="/merchant/pos/discounts" element={<RoleBasedRoute allowedRoles={['merchant']}><POSDiscountsPage /></RoleBasedRoute>} />
                  <Route path="/merchant/pos/purchase-orders" element={<RoleBasedRoute allowedRoles={['merchant']}><POSPurchaseOrdersPage /></RoleBasedRoute>} />
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
                </AppsProvider>
                </DeveloperModeProvider>
              </NotificationProvider>
              </NFCProvider>
            </AuthProvider>
          </BrowserRouter>
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
