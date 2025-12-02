import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/context/AuthContext';
import { DeveloperModeProvider } from '@/context/DeveloperModeContext';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { RoleBasedRoute } from '@/components/RoleBasedRoute';
import { LandingPage } from '@/pages/LandingPage';
import { LoginPage } from '@/pages/auth/LoginPage';
import { RegisterPage } from '@/pages/auth/RegisterPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { WalletsPage } from '@/pages/WalletsPage';
import { CardsPage } from '@/pages/CardsPage';
import { TransactionsPage } from '@/pages/TransactionsPage';
import { ProfilePage } from '@/pages/ProfilePage';
import { ApiDocsPage } from '@/pages/ApiDocsPage';
import { SendMoneyPage } from '@/pages/SendMoneyPage';
import { ReceiveMoneyPage } from '@/pages/ReceiveMoneyPage';
import { PotsPage } from '@/pages/PotsPage';
import { PotDetailPage } from '@/pages/PotDetailPage';

// New Card Management Pages
import { CardMarketplacePage } from '@/pages/CardMarketplacePage';
import { MyCardsPage } from '@/pages/MyCardsPage';

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
import { TransactionsPage as AdminTransactionsPage } from '@/pages/admin/TransactionsPage';
import { DisputesPage } from '@/pages/admin/DisputesPage';
import { DevelopersPage } from '@/pages/admin/DevelopersPage';
import { UsersManagementPage } from '@/pages/admin/UsersManagementPage';
import { UserDetailPage } from '@/pages/admin/UserDetailPage';
import { MerchantsManagementPage } from '@/pages/admin/MerchantsManagementPage';
import { AgentsManagementPage } from '@/pages/admin/AgentsManagementPage';
import { FeesPage } from '@/pages/admin/FeesPage';
import { FeeSettingsPage } from '@/pages/admin/FeeSettingsPage';
import { SubscriptionsPage } from '@/pages/admin/SubscriptionsPage';
import { RolesManagementPage } from '@/pages/admin/RolesManagementPage';
import { PotsManagementPage } from '@/pages/admin/PotsManagementPage';
import { PaymentCheckoutPage } from '@/pages/PaymentCheckoutPage';
import { PayPage } from '@/pages/PayPage';

// Merchant Pages
import { MerchantDashboard } from '@/pages/merchant/MerchantDashboard';
import { MerchantSettingsPage } from '@/pages/merchant/MerchantSettingsPage';
import { MerchantDeveloperPage } from '@/pages/merchant/MerchantDeveloperPage';

// Agent Pages
import { AgentDashboard } from '@/pages/agent/AgentDashboard';
import { AgentSettingsPage } from '@/pages/agent/AgentSettingsPage';
import { AgentDeveloperPage } from '@/pages/agent/AgentDeveloperPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <DeveloperModeProvider>
            <Routes>
              {/* Public routes */}
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/docs" element={<ApiDocsPage />} />

              {/* Payment Checkout Routes (NFC/QR) */}
              <Route path="/t/:token" element={<PaymentCheckoutPage />} />
              <Route path="/pay/:token" element={<PaymentCheckoutPage />} />

              {/* Payment Link Route (query params) */}
              <Route path="/pay" element={<PayPage />} />

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
                path="/merchant/settings"
                element={
                  <RoleBasedRoute allowedRoles={['merchant']}>
                    <MerchantSettingsPage />
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
            </Routes>
          </DeveloperModeProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
