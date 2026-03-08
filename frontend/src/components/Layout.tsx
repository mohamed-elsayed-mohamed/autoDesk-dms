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
import { useAuth } from '../modules/auth/AuthContext';
import { UserRole } from '../types';

const DRAWER_WIDTH = 260;

const roleLabels: Record<string, string> = {
  InventoryManager: 'Inventory Manager',
  SalesConsultant: 'Sales Consultant',
  GeneralManager: 'General Manager',
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
            {visibleItems.map((item) => (
              <ListItemButton
                key={item.path}
                selected={location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path))}
                onClick={() => navigate(item.path)}
                sx={{ borderRadius: 1, mx: 1, mb: 0.5 }}
              >
                <ListItemIcon>{item.icon}</ListItemIcon>
                <ListItemText primary={item.label} />
              </ListItemButton>
            ))}
          </List>
        </Box>
      </Drawer>

      <Box component="main" sx={{ flexGrow: 1, p: 3, mt: 8, ml: 0 }}>
        <Outlet />
      </Box>
    </Box>
  );
}
