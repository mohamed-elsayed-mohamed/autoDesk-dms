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
          </Route>
        </Routes>
      </AuthProvider>
    </ThemeProvider>
  );
}
