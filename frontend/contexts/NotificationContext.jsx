import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { API_URL } from '../lib/apiConfig';
import apiClient from '../lib/apiClient';

const NotificationContext = createContext();

export const useNotifications = () => {
    const context = useContext(NotificationContext);
    if (!context) {
        throw new Error('useNotifications must be used within a NotificationProvider');
    }
    return context;
};

export const NotificationProvider = ({ children }) => {
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [lastNotification, setLastNotification] = useState(null);
    const [isConnected, setIsConnected] = useState(false);

    // Fetch initial notifications
    const fetchNotifications = useCallback(async () => {
        try {
            const data = await apiClient.getNotifications(50);
            if (Array.isArray(data)) {
                setNotifications(data);
                setUnreadCount(data.filter(n => !n.is_read).length);
            }
        } catch (error) {
            console.error('Failed to fetch notifications:', error);
        }
    }, []);

    // Mark as read
    const markAsRead = async (id) => {
        try {
            await apiClient.markNotificationRead(id);
            setNotifications(prev => 
                prev.map(n => n.id === id ? { ...n, is_read: true } : n)
            );
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (error) {
            console.error('Failed to mark notification read:', error);
        }
    };

    const markAllAsRead = async () => {
        const unread = notifications.filter(n => !n.is_read);
        for (const n of unread) {
            await markAsRead(n.id);
        }
    };

    // Centralized click handler for notifications
    const handleNotificationClick = async (notif, router) => {
        if (!notif.is_read) {
            await markAsRead(notif.id);
        }
        if (notif.link && router) {
            router.push(notif.link);
        }
    };

    const eventSourceRef = useRef(null);
    const reconnectTimerRef = useRef(null);

    // Establish SSE Connection
    useEffect(() => {
        const user = localStorage.getItem('user');
        const token = localStorage.getItem('accessToken');
        
        if (!user || !token) {
            return;
        }

        const streamUrl = `${API_URL}/notifications/stream?token=${token}`;
        
        const connect = () => {
            if (reconnectTimerRef.current) {
                clearTimeout(reconnectTimerRef.current);
                reconnectTimerRef.current = null;
            }

            if (eventSourceRef.current) {
                eventSourceRef.current.close();
            }

            const es = new EventSource(streamUrl);
            eventSourceRef.current = es;

            es.onopen = () => {
                console.log('SSE Notification Stream Connected');
                setIsConnected(true);
            };

            es.addEventListener('notification', (event) => {
                try {
                    const data = JSON.parse(event.data);
                    
                    // Handle refresh broadcast from other tabs
                    if (data.type === 'REFRESH_BADGE') {
                        fetchNotifications();
                        return;
                    }

                    // Handle full-screen push sync if we are on the notifications page
                    if (window.location.pathname === '/notifications') {
                        fetchNotifications();
                    }

                    // Add to local state (for drawer/toasts)
                    setNotifications(prev => [data, ...prev].slice(0, 100));
                    setUnreadCount(prev => prev + 1);
                    setLastNotification(data);
                    
                    // Clear last notification after 5 seconds (toast duration)
                    setTimeout(() => {
                        setLastNotification(null);
                    }, 5000);
                    
                } catch (err) {
                    console.error('Failed to parse SSE notification data:', err);
                }
            });

            es.onerror = (err) => {
                console.error('SSE Error:', err);
                setIsConnected(false);
                es.close();
                
                // Attempt reconnect after 10 seconds if not already scheduled
                if (!reconnectTimerRef.current) {
                    reconnectTimerRef.current = setTimeout(connect, 10000);
                }
            };
        };

        connect();
        fetchNotifications();

        return () => {
            if (eventSourceRef.current) {
                eventSourceRef.current.close();
            }
            if (reconnectTimerRef.current) {
                clearTimeout(reconnectTimerRef.current);
            }
        };
    }, [fetchNotifications]);

    const value = {
        notifications,
        unreadCount,
        lastNotification,
        isConnected,
        markAsRead,
        markAllAsRead,
        handleNotificationClick,
        refresh: fetchNotifications
    };

    return (
        <NotificationContext.Provider value={value}>
            {children}
        </NotificationContext.Provider>
    );
};
