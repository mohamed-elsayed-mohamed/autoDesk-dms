import { useState, useEffect, useRef, useCallback } from 'react';
import {
  IconButton,
  Badge,
  Popover,
  Box,
  Typography,
  List,
  ListItemButton,
  ListItemText,
  Button,
  Divider,
  CircularProgress,
} from '@mui/material';
import NotificationsIcon from '@mui/icons-material/Notifications';
import { useNavigate } from 'react-router-dom';
import { getUnreadCount, getNotifications, markAllNotificationsRead, markNotificationRead } from '../api/notifications';
import type { Notification } from '../types';
import { useAuth } from '../modules/auth/AuthContext';
import { UserRole } from '../types';

const POLL_INTERVAL_MS = 30_000;

export default function NotificationBell() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isCrmRole = user && [UserRole.SalesConsultant, UserRole.BDCAgent, UserRole.SalesManager].includes(user.role as UserRole);

  const fetchCount = useCallback(async () => {
    if (!isCrmRole) return;
    try {
      const { count } = await getUnreadCount();
      setUnreadCount(count);
    } catch {
      // silent poll failure
    }
  }, [isCrmRole]);

  useEffect(() => {
    if (!isCrmRole) return;
    fetchCount();
    intervalRef.current = setInterval(fetchCount, POLL_INTERVAL_MS);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isCrmRole, fetchCount]);

  const handleOpen = async (e: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(e.currentTarget);
    setLoading(true);
    try {
      const res = await getNotifications({ limit: 20 });
      setNotifications(res.data);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => setAnchorEl(null);

  const handleMarkAll = async () => {
    await markAllNotificationsRead();
    setUnreadCount(0);
    setNotifications((prev) => prev.map((n) => ({ ...n, readAt: new Date().toISOString() })));
  };

  const handleClick = async (n: Notification) => {
    if (!n.readAt) {
      await markNotificationRead(n.id);
      setUnreadCount((c) => Math.max(0, c - 1));
      setNotifications((prev) => prev.map((x) => (x.id === n.id ? { ...x, readAt: new Date().toISOString() } : x)));
    }
    handleClose();
    navigate(`/leads/${n.referenceId}`);
  };

  if (!isCrmRole) return null;

  return (
    <>
      <IconButton color="inherit" onClick={handleOpen} title="Notifications">
        <Badge badgeContent={unreadCount} color="error">
          <NotificationsIcon />
        </Badge>
      </IconButton>

      <Popover
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Box sx={{ width: 340 }}>
          <Box sx={{ px: 2, py: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="subtitle1" fontWeight={700}>Notifications</Typography>
            {unreadCount > 0 && (
              <Button size="small" onClick={handleMarkAll}>Mark all read</Button>
            )}
          </Box>
          <Divider />
          {loading ? (
            <Box sx={{ p: 3, textAlign: 'center' }}><CircularProgress size={24} /></Box>
          ) : notifications.length === 0 ? (
            <Box sx={{ p: 3, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">No notifications</Typography>
            </Box>
          ) : (
            <List disablePadding sx={{ maxHeight: 360, overflow: 'auto' }}>
              {notifications.map((n) => (
                <ListItemButton
                  key={n.id}
                  onClick={() => handleClick(n)}
                  sx={{ bgcolor: n.readAt ? 'transparent' : 'action.hover', py: 1 }}
                >
                  <ListItemText
                    primary={n.message}
                    secondary={new Date(n.createdAt).toLocaleString()}
                    primaryTypographyProps={{ variant: 'body2', fontWeight: n.readAt ? 400 : 600 }}
                    secondaryTypographyProps={{ variant: 'caption' }}
                  />
                </ListItemButton>
              ))}
            </List>
          )}
        </Box>
      </Popover>
    </>
  );
}
