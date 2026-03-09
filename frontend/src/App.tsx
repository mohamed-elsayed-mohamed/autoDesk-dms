import { Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';
import { AuthProvider } from './modules/auth/AuthContext';
import LoginPage from './modules/auth/LoginPage';
import ProtectedRoute from './modules/auth/ProtectedRoute';
import Layout from './components/Layout';
import { UserRole } from './types';

import VehicleListPage from './modules/inventory/VehicleListPage';
import VehicleDetailPage from './modules/inventory/VehicleDetailPage';
import VehicleFormPage from './modules/inventory/VehicleFormPage';
import ArchivedVehiclesPage from './modules/inventory/ArchivedVehiclesPage';
import DashboardPage from './modules/inventory/DashboardPage';

import CustomerListPage from './modules/crm/customers/CustomerListPage';
import CustomerFormPage from './modules/crm/customers/CustomerFormPage';
import CustomerDetailPage from './modules/crm/customers/CustomerDetailPage';
import LeadListPage from './modules/crm/leads/LeadListPage';
import LeadFormPage from './modules/crm/leads/LeadFormPage';
import LeadDetailPage from './modules/crm/leads/LeadDetailPage';
import MyTasksPage from './modules/crm/tasks/MyTasksPage';
import ManagerDashboardPage from './modules/crm/dashboard/ManagerDashboardPage';

import DealListPage from './modules/deals/pages/DealListPage';
import DealCreatePage from './modules/deals/pages/DealCreatePage';
import DeskingPage from './modules/deals/pages/DeskingPage';
import DealJacketPage from './modules/deals/pages/DealJacketPage';
import ManagerApprovalQueuePage from './modules/deals/pages/ManagerApprovalQueuePage';
import SalesReportPage from './modules/deals/pages/SalesReportPage';
import DealErrorBoundary from './modules/deals/components/DealErrorBoundary';

const theme = createTheme({
  palette: {
    primary: { main: '#1565c0' },
    secondary: { main: '#f57c00' },
  },
  shape: { borderRadius: 10 },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h4: { fontWeight: 700 },
    h5: { fontWeight: 700 },
    h6: { fontWeight: 600 },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: { textTransform: 'none', fontWeight: 600 },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: { borderRadius: 12 },
      },
    },
  },
});

export default function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route path="/vehicles" element={<VehicleListPage />} />
            <Route
              path="/vehicles/new"
              element={
                <ProtectedRoute allowedRoles={[UserRole.InventoryManager]}>
                  <VehicleFormPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/vehicles/:id/edit"
              element={
                <ProtectedRoute allowedRoles={[UserRole.InventoryManager]}>
                  <VehicleFormPage />
                </ProtectedRoute>
              }
            />
            <Route path="/vehicles/:id" element={<VehicleDetailPage />} />
            <Route
              path="/vehicles/archived"
              element={
                <ProtectedRoute allowedRoles={[UserRole.InventoryManager]}>
                  <ArchivedVehiclesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute allowedRoles={[UserRole.GeneralManager, UserRole.InventoryManager]}>
                  <DashboardPage />
                </ProtectedRoute>
              }
            />
            <Route path="/" element={<Navigate to="/vehicles" replace />} />

            {/* CRM Routes */}
            <Route
              path="/customers"
              element={
                <ProtectedRoute allowedRoles={[UserRole.SalesConsultant, UserRole.BDCAgent, UserRole.SalesManager]}>
                  <CustomerListPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/customers/new"
              element={
                <ProtectedRoute allowedRoles={[UserRole.SalesConsultant, UserRole.BDCAgent, UserRole.SalesManager]}>
                  <CustomerFormPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/customers/:id/edit"
              element={
                <ProtectedRoute allowedRoles={[UserRole.SalesConsultant, UserRole.BDCAgent, UserRole.SalesManager]}>
                  <CustomerFormPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/customers/:id"
              element={
                <ProtectedRoute allowedRoles={[UserRole.SalesConsultant, UserRole.BDCAgent, UserRole.SalesManager]}>
                  <CustomerDetailPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/leads"
              element={
                <ProtectedRoute allowedRoles={[UserRole.SalesConsultant, UserRole.BDCAgent, UserRole.SalesManager]}>
                  <LeadListPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/leads/new"
              element={
                <ProtectedRoute allowedRoles={[UserRole.SalesConsultant, UserRole.BDCAgent, UserRole.SalesManager]}>
                  <LeadFormPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/leads/:id"
              element={
                <ProtectedRoute allowedRoles={[UserRole.SalesConsultant, UserRole.BDCAgent, UserRole.SalesManager]}>
                  <LeadDetailPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/tasks"
              element={
                <ProtectedRoute allowedRoles={[UserRole.SalesConsultant, UserRole.BDCAgent, UserRole.SalesManager]}>
                  <MyTasksPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/tasks/team"
              element={
                <ProtectedRoute allowedRoles={[UserRole.SalesManager]}>
                  <MyTasksPage teamView />
                </ProtectedRoute>
              }
            />
            <Route
              path="/crm-dashboard"
              element={
                <ProtectedRoute allowedRoles={[UserRole.SalesManager]}>
                  <ManagerDashboardPage />
                </ProtectedRoute>
              }
            />

            {/* Deals Routes */}
            <Route
              path="/deals"
              element={
                <ProtectedRoute allowedRoles={[UserRole.SalesConsultant, UserRole.SalesManager, UserRole.FniManager, UserRole.GeneralManager]}>
                  <DealErrorBoundary pageName="Deal List"><DealListPage /></DealErrorBoundary>
                </ProtectedRoute>
              }
            />
            <Route
              path="/deals/new"
              element={
                <ProtectedRoute allowedRoles={[UserRole.SalesConsultant]}>
                  <DealErrorBoundary pageName="Create Deal"><DealCreatePage /></DealErrorBoundary>
                </ProtectedRoute>
              }
            />
            <Route
              path="/deals/:id/jacket"
              element={
                <ProtectedRoute allowedRoles={[UserRole.SalesConsultant, UserRole.SalesManager, UserRole.FniManager, UserRole.GeneralManager]}>
                  <DealErrorBoundary pageName="Deal Jacket"><DealJacketPage /></DealErrorBoundary>
                </ProtectedRoute>
              }
            />
            <Route
              path="/deals/approval-queue"
              element={
                <ProtectedRoute allowedRoles={[UserRole.SalesManager]}>
                  <DealErrorBoundary pageName="Approval Queue"><ManagerApprovalQueuePage /></DealErrorBoundary>
                </ProtectedRoute>
              }
            />
            <Route
              path="/deals/:id"
              element={
                <ProtectedRoute allowedRoles={[UserRole.SalesConsultant, UserRole.SalesManager, UserRole.FniManager, UserRole.GeneralManager]}>
                  <DealErrorBoundary pageName="Desking"><DeskingPage /></DealErrorBoundary>
                </ProtectedRoute>
              }
            />
            <Route
              path="/reports/sales"
              element={
                <ProtectedRoute allowedRoles={[UserRole.SalesManager, UserRole.GeneralManager]}>
                  <DealErrorBoundary pageName="Sales Report"><SalesReportPage /></DealErrorBoundary>
                </ProtectedRoute>
              }
            />
          </Route>
        </Routes>
      </AuthProvider>
    </ThemeProvider>
  );
}
