'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { 
  Home, 
  Lightbulb, 
  Trophy, 
  Bell, 
  Megaphone, 
  Settings, 
  Users, 
  Gift, 
  FileText, 
  LogOut,
  Menu,
  X,
  ChevronRight
} from 'lucide-react';

interface SidebarProps {
  activeView: string;
  onViewChange: (view: string) => void;
}

export function Sidebar({ activeView, onViewChange }: SidebarProps) {
  const { user, signOut } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Home },
    { id: 'ideas', label: 'Ideas', icon: Lightbulb },
    { id: 'leaderboard', label: 'Leaderboard', icon: Trophy },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'announcements', label: 'Announcements', icon: Megaphone },
  ];

  const adminItems = [
    { id: 'manage-users', label: 'Manage Users', icon: Users },
    { id: 'vouchers', label: 'Vouchers', icon: Gift },
    { id: 'documents', label: 'Document Requests', icon: FileText },
  ];

  const handleNavClick = (viewId: string) => {
    onViewChange(viewId);
    setIsMobileOpen(false);
  };

  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        className="fixed top-4 left-4 z-50 p-2 bg-sidebar text-sidebar-foreground rounded-lg lg:hidden"
      >
        {isMobileOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Mobile overlay */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 h-full bg-sidebar text-sidebar-foreground z-40
          transition-all duration-300 ease-in-out
          ${isCollapsed ? 'w-20' : 'w-64'}
          ${isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-4 border-b border-sidebar-hover">
            <div className="flex items-center justify-between">
              {!isCollapsed && (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                    <Lightbulb className="text-white" size={24} />
                  </div>
                  <span className="text-xl font-bold">Innovastion</span>
                </div>
              )}
              <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="p-2 rounded-lg hover:bg-sidebar-hover hidden lg:block"
              >
                <ChevronRight 
                  size={20} 
                  className={`transition-transform ${isCollapsed ? '' : 'rotate-180'}`}
                />
              </button>
            </div>
          </div>

          {/* User info */}
          {user && (
            <div className={`p-4 border-b border-sidebar-hover ${isCollapsed ? 'text-center' : ''}`}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-primary font-semibold">
                    {user.fullName.charAt(0).toUpperCase()}
                  </span>
                </div>
                {!isCollapsed && (
                  <div className="overflow-hidden">
                    <p className="font-medium truncate">{user.fullName}</p>
                    <p className="text-sm text-muted-foreground truncate">{user.department}</p>
                  </div>
                )}
              </div>
              {!isCollapsed && (
                <div className="mt-3 flex items-center gap-2">
                  <div className="flex-1 bg-sidebar-hover rounded-full h-2">
                    <div 
                      className="bg-secondary h-full rounded-full"
                      style={{ width: `${Math.min((user.points / 500) * 100, 100)}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium">{user.points} pts</span>
                </div>
              )}
            </div>
          )}

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
            {menuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`
                  w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors
                  ${activeView === item.id 
                    ? 'bg-primary text-white' 
                    : 'hover:bg-sidebar-hover'
                  }
                  ${isCollapsed ? 'justify-center' : ''}
                `}
                title={isCollapsed ? item.label : undefined}
              >
                <item.icon size={20} />
                {!isCollapsed && <span>{item.label}</span>}
              </button>
            ))}

            {user?.role === 'admin' && (
              <>
                <div className={`pt-4 pb-2 ${isCollapsed ? 'hidden' : ''}`}>
                  <p className="text-xs uppercase text-muted-foreground font-semibold">Admin</p>
                </div>
                {adminItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleNavClick(item.id)}
                    className={`
                      w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors
                      ${activeView === item.id 
                        ? 'bg-primary text-white' 
                        : 'hover:bg-sidebar-hover'
                      }
                      ${isCollapsed ? 'justify-center' : ''}
                    `}
                    title={isCollapsed ? item.label : undefined}
                  >
                    <item.icon size={20} />
                    {!isCollapsed && <span>{item.label}</span>}
                  </button>
                ))}
              </>
            )}
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-sidebar-hover">
            <button
              onClick={signOut}
              className={`
                w-full flex items-center gap-3 px-3 py-2.5 rounded-lg 
                hover:bg-danger/20 text-danger transition-colors
                ${isCollapsed ? 'justify-center' : ''}
              `}
              title={isCollapsed ? 'Sign Out' : undefined}
            >
              <LogOut size={20} />
              {!isCollapsed && <span>Sign Out</span>}
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
