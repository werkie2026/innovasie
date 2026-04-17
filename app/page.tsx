'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { AuthPage } from '@/components/auth';
import { Sidebar } from '@/components/sidebar';
import { Dashboard } from '@/components/dashboard';
import { Ideas } from '@/components/ideas';
import { Leaderboard } from '@/components/leaderboard';
import { Notifications } from '@/components/notifications';
import { Announcements } from '@/components/announcements';
import { ManageUsers } from '@/components/admin/manage-users';
import { Vouchers } from '@/components/admin/vouchers';
import { DocumentRequests } from '@/components/admin/documents';

export default function Home() {
  const { user, loading } = useAuth();
  const [activeView, setActiveView] = useState('dashboard');

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthPage />;
  }

  const renderView = () => {
    switch (activeView) {
      case 'dashboard':
        return <Dashboard />;
      case 'ideas':
        return <Ideas />;
      case 'leaderboard':
        return <Leaderboard />;
      case 'notifications':
        return <Notifications />;
      case 'announcements':
        return <Announcements />;
      case 'manage-users':
        return user.role === 'admin' ? <ManageUsers /> : <Dashboard />;
      case 'vouchers':
        return user.role === 'admin' ? <Vouchers /> : <Dashboard />;
      case 'documents':
        return <DocumentRequests />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Sidebar activeView={activeView} onViewChange={setActiveView} />
      
      <main className="lg:ml-64 min-h-screen">
        <div className="p-4 lg:p-8 pt-16 lg:pt-8">
          {renderView()}
        </div>
      </main>
    </div>
  );
}
