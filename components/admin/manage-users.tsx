'use client';

import { useEffect, useState } from 'react';
import { collection, getDocs, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { User, BADGES } from '@/lib/types';
import { Users, Search, Shield, Trash2, Edit2, X } from 'lucide-react';

export function ManageUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editingUser, setEditingUser] = useState<User | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'users'));
      const usersData: User[] = [];
      snapshot.forEach((doc) => {
        usersData.push({ ...doc.data(), id: doc.id } as User);
      });
      setUsers(usersData.sort((a, b) => b.points - a.points));
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleRole = async (user: User) => {
    const newRole = user.role === 'admin' ? 'user' : 'admin';
    try {
      await updateDoc(doc(db, 'users', user.id), { role: newRole });
      setUsers(users.map(u => u.id === user.id ? { ...u, role: newRole } : u));
    } catch (error) {
      console.error('Error updating role:', error);
    }
  };

  const updateUserPoints = async (userId: string, points: number) => {
    try {
      await updateDoc(doc(db, 'users', userId), { points });
      setUsers(users.map(u => u.id === userId ? { ...u, points } : u));
      setEditingUser(null);
    } catch (error) {
      console.error('Error updating points:', error);
    }
  };

  const filteredUsers = users.filter(user =>
    user.fullName.toLowerCase().includes(search.toLowerCase()) ||
    user.email.toLowerCase().includes(search.toLowerCase()) ||
    user.department.toLowerCase().includes(search.toLowerCase())
  );

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
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Users className="text-primary" />
          Manage Users
        </h1>
        <p className="text-muted mt-1">View and manage all registered users</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-card rounded-xl p-4">
          <p className="text-sm text-muted">Total Users</p>
          <p className="text-2xl font-bold">{users.length}</p>
        </div>
        <div className="bg-card rounded-xl p-4">
          <p className="text-sm text-muted">Admins</p>
          <p className="text-2xl font-bold">{users.filter(u => u.role === 'admin').length}</p>
        </div>
        <div className="bg-card rounded-xl p-4">
          <p className="text-sm text-muted">Total Points</p>
          <p className="text-2xl font-bold">{users.reduce((sum, u) => sum + u.points, 0)}</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={20} />
        <input
          type="text"
          placeholder="Search users..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2 bg-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      {/* Users Table */}
      <div className="bg-card rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-background">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted">User</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted">Department</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted">Role</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted">Points</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted">Badges</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-muted">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-background">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium text-primary">
                          {user.fullName.charAt(0)}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium">{user.fullName}</p>
                        <p className="text-sm text-muted">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm">{user.department}</td>
                  <td className="px-4 py-3">
                    <span className={`
                      px-2 py-1 text-xs rounded-full font-medium
                      ${user.role === 'admin' ? 'bg-primary/20 text-primary' : 'bg-muted/20 text-muted'}
                    `}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-medium">{user.points}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      {user.badges.slice(0, 3).map((badgeId) => {
                        const badge = BADGES.find(b => b.id === badgeId);
                        return badge ? (
                          <span key={badgeId} title={badge.name}>{badge.icon}</span>
                        ) : null;
                      })}
                      {user.badges.length > 3 && (
                        <span className="text-xs text-muted">+{user.badges.length - 3}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setEditingUser(user)}
                        className="p-2 hover:bg-background rounded-lg transition-colors"
                        title="Edit points"
                      >
                        <Edit2 size={16} className="text-muted" />
                      </button>
                      <button
                        onClick={() => toggleRole(user)}
                        className="p-2 hover:bg-background rounded-lg transition-colors"
                        title={user.role === 'admin' ? 'Remove admin' : 'Make admin'}
                      >
                        <Shield size={16} className={user.role === 'admin' ? 'text-primary' : 'text-muted'} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Points Modal */}
      {editingUser && (
        <EditPointsModal
          user={editingUser}
          onClose={() => setEditingUser(null)}
          onSave={(points) => updateUserPoints(editingUser.id, points)}
        />
      )}
    </div>
  );
}

function EditPointsModal({
  user,
  onClose,
  onSave
}: {
  user: User;
  onClose: () => void;
  onSave: (points: number) => void;
}) {
  const [points, setPoints] = useState(user.points);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-card rounded-xl p-6 shadow-xl w-full max-w-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">Edit Points</h2>
          <button onClick={onClose} className="p-2 hover:bg-background rounded-lg">
            <X size={20} />
          </button>
        </div>
        
        <p className="text-sm text-muted mb-4">
          Editing points for <span className="font-medium text-foreground">{user.fullName}</span>
        </p>
        
        <input
          type="number"
          value={points}
          onChange={(e) => setPoints(Number(e.target.value))}
          min={0}
          className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary mb-4"
        />
        
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-muted hover:text-foreground transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onSave(points)}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
