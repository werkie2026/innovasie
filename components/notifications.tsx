'use client';

import { useEffect, useState } from 'react';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  updateDoc, 
  doc,
  writeBatch
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/auth-context';
import { Notification } from '@/lib/types';
import { 
  Bell, 
  Lightbulb, 
  Award, 
  Gift, 
  Megaphone, 
  Settings,
  Check,
  CheckCheck
} from 'lucide-react';

export function Notifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  useEffect(() => {
    if (!user) return;

    const notificationsQuery = query(
      collection(db, 'notifications'),
      where('userId', '==', user.id),
      orderBy('createdAt', 'desc')
    );
    
    const unsubscribe = onSnapshot(notificationsQuery, (snapshot) => {
      const data: Notification[] = [];
      snapshot.forEach((doc) => {
        data.push({ ...doc.data(), id: doc.id } as Notification);
      });
      setNotifications(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const markAsRead = async (notificationId: string) => {
    try {
      await updateDoc(doc(db, 'notifications', notificationId), {
        read: true
      });
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const batch = writeBatch(db);
      notifications
        .filter(n => !n.read)
        .forEach(n => {
          batch.update(doc(db, 'notifications', n.id), { read: true });
        });
      await batch.commit();
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const getIcon = (type: Notification['type']) => {
    switch (type) {
      case 'idea':
        return <Lightbulb className="text-primary" size={20} />;
      case 'badge':
        return <Award className="text-accent" size={20} />;
      case 'voucher':
        return <Gift className="text-secondary" size={20} />;
      case 'announcement':
        return <Megaphone className="text-primary" size={20} />;
      default:
        return <Settings className="text-muted" size={20} />;
    }
  };

  const formatDate = (date: Date | { toDate: () => Date }) => {
    const d = date instanceof Date ? date : date?.toDate?.() || new Date();
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const filteredNotifications = filter === 'unread' 
    ? notifications.filter(n => !n.read)
    : notifications;

  const unreadCount = notifications.filter(n => !n.read).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Bell className="text-primary" />
            Notifications
            {unreadCount > 0 && (
              <span className="px-2 py-0.5 bg-danger text-white text-sm rounded-full">
                {unreadCount}
              </span>
            )}
          </h1>
          <p className="text-muted mt-1">Stay updated with your activity</p>
        </div>
        
        <div className="flex gap-2">
          <div className="flex bg-card rounded-lg p-1">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                filter === 'all' ? 'bg-primary text-white' : 'hover:bg-background'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter('unread')}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                filter === 'unread' ? 'bg-primary text-white' : 'hover:bg-background'
              }`}
            >
              Unread
            </button>
          </div>
          
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-card hover:bg-background rounded-lg transition-colors"
            >
              <CheckCheck size={18} />
              Mark all read
            </button>
          )}
        </div>
      </div>

      {/* Notifications List */}
      <div className="bg-card rounded-xl shadow-sm overflow-hidden">
        {filteredNotifications.length === 0 ? (
          <div className="p-12 text-center">
            <Bell className="mx-auto text-muted mb-4" size={48} />
            <p className="text-muted">
              {filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filteredNotifications.map((notification) => (
              <div
                key={notification.id}
                className={`
                  flex items-start gap-4 p-4 hover:bg-background transition-colors cursor-pointer
                  ${!notification.read ? 'bg-primary/5' : ''}
                `}
                onClick={() => !notification.read && markAsRead(notification.id)}
              >
                <div className="p-2 bg-background rounded-lg">
                  {getIcon(notification.type)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <p className={`font-medium ${!notification.read ? '' : 'text-muted'}`}>
                    {notification.title}
                  </p>
                  <p className="text-sm text-muted mt-0.5">{notification.message}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatDate(notification.createdAt)}
                  </p>
                </div>
                
                {!notification.read && (
                  <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0 mt-2"></div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
