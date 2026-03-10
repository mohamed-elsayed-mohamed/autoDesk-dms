import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  Typography,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  IconButton,
  Chip,
} from '@mui/material';
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar';
import InventoryIcon from '@mui/icons-material/Inventory2';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import DashboardIcon from '@mui/icons-material/Dashboard';
import ArchiveIcon from '@mui/icons-material/Archive';
import LogoutIcon from '@mui/icons-material/Logout';
import PeopleIcon from '@mui/icons-material/People';
import LeaderboardIcon from '@mui/icons-material/Leaderboard';
import AssignmentIcon from '@mui/icons-material/Assignment';
import GavelIcon from '@mui/icons-material/Gavel';
import BarChartIcon from '@mui/icons-material/BarChart';
import NotificationBell from './NotificationBell';
import { useAuth } from '../modules/auth/AuthContext';
import { UserRole } from '../types';

const DRAWER_WIDTH = 260;

const roleLabels: Record<string, string> = {
  InventoryManager: 'Inventory Manager',
  SalesConsultant: 'Sales Consultant',
  GeneralManager: 'General Manager',
  SalesManager: 'Sales Manager',
  BDCAgent: 'BDC Agent',
  FniManager: 'F&I Manager',
  Controller: 'Controller',
};

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  if (!user) return null;

  const navItems = [
    {
      label: 'Inventory',
      icon: <InventoryIcon />,
      path: '/vehicles',
      roles: [UserRole.InventoryManager, UserRole.SalesConsultant, UserRole.GeneralManager],
    },
    {
      label: 'Add Vehicle',
      icon: <AddCircleIcon />,
      path: '/vehicles/new',
      roles: [UserRole.InventoryManager],
    },
    {
      label: 'Archived',
      icon: <ArchiveIcon />,
      path: '/vehicles/archived',
      roles: [UserRole.InventoryManager],
    },
    {
      label: 'Dashboard',
      icon: <DashboardIcon />,
      path: '/dashboard',
      roles: [UserRole.GeneralManager, UserRole.InventoryManager],
    },
    { label: 'divider-crm', icon: null, path: '', roles: [UserRole.SalesConsultant, UserRole.BDCAgent, UserRole.SalesManager] },
    {
      label: 'Customers',
      icon: <PeopleIcon />,
      path: '/customers',
      roles: [UserRole.SalesConsultant, UserRole.BDCAgent, UserRole.SalesManager],
    },
    {
      label: 'Leads',
      icon: <LeaderboardIcon />,
      path: '/leads',
      roles: [UserRole.SalesConsultant, UserRole.BDCAgent, UserRole.SalesManager],
    },
    {
      label: 'My Tasks',
      icon: <AssignmentIcon />,
      path: '/tasks',
      roles: [UserRole.SalesConsultant, UserRole.BDCAgent, UserRole.SalesManager],
    },
    {
      label: 'CRM Dashboard',
      icon: <DashboardIcon />,
      path: '/crm-dashboard',
      roles: [UserRole.SalesManager],
    },
    { label: 'divider-deals', icon: null, path: '', roles: [UserRole.SalesConsultant, UserRole.SalesManager] },
    {
      label: 'Deals',
      icon: <GavelIcon />,
      path: '/deals',
      roles: [UserRole.SalesConsultant, UserRole.SalesManager],
    },
    {
      label: 'Approval Queue',
      icon: <AssignmentIcon />,
      path: '/deals/approval-queue',
      roles: [UserRole.SalesManager],
    },
    {
      label: 'Sales Report',
      icon: <BarChartIcon />,
      path: '/reports/sales',
      roles: [UserRole.SalesManager],
    },
    { label: 'divider-fi', icon: null, path: '', roles: [UserRole.FniManager, UserRole.Controller] },
    {
      label: 'Deals',
      icon: <GavelIcon />,
      path: '/deals',
      roles: [UserRole.FniManager, UserRole.Controller],
    },
    {
      label: 'F&I Performance Report',
      icon: <BarChartIcon />,
      path: '/reports/fi-performance',
      roles: [UserRole.FniManager, UserRole.Controller],
    },
  ];

  const visibleItems = navItems.filter((item) => item.roles.includes(user.role));

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
        <Toolbar>
          <DirectionsCarIcon sx={{ mr: 1.5 }} />
          <Typography variant="h6" noWrap flexGrow={1} fontWeight={700}>
            AutoDesk DMS
          </Typography>
          <Chip
            label={roleLabels[user.role] || user.role}
            size="small"
            sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.5)', mr: 2 }}
            variant="outlined"
          />
          <Typography variant="body2" sx={{ mr: 2, color: 'rgba(255,255,255,0.9)' }}>
            {user.firstName} {user.lastName}
          </Typography>
          <NotificationBell />
          <IconButton color="inherit" onClick={logout} title="Sign out">
            <LogoutIcon />
          </IconButton>
        </Toolbar>
      </AppBar>

      <Drawer
        variant="permanent"
        sx={{
          width: DRAWER_WIDTH,
          flexShrink: 0,
          '& .MuiDrawer-paper': { width: DRAWER_WIDTH, boxSizing: 'border-box' },
        }}
      >
        <Toolbar />
        <Box sx={{ overflow: 'auto', mt: 1 }}>
          <List>
            {visibleItems.map((item) =>
              item.label.startsWith('divider') ? (
                <Box key={item.label} sx={{ mx: 2, my: 1, borderTop: '1px solid', borderColor: 'divider' }} />
              ) : (
                <ListItemButton
                  key={item.path}
                  selected={location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path))}
                  onClick={() => navigate(item.path)}
                  sx={{ borderRadius: 1, mx: 1, mb: 0.5 }}
                >
                  <ListItemIcon>{item.icon}</ListItemIcon>
                  <ListItemText primary={item.label} />
                </ListItemButton>
              )
            )}
          </List>
        </Box>
      </Drawer>

      <Box component="main" sx={{ flexGrow: 1, p: 3, mt: 8, ml: 0 }}>
        <Outlet />
      </Box>
    </Box>
  );
}
