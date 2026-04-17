'use client';

import { useEffect, useState } from 'react';
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  doc, 
  serverTimestamp,
  getDocs
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/auth-context';
import { Voucher, User } from '@/lib/types';
import { Gift, Plus, X, Check, Clock, CheckCircle } from 'lucide-react';

export function Vouchers() {
  const { user: currentUser } = useAuth();
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'redeemed'>('all');

  // Form state
  const [selectedUserId, setSelectedUserId] = useState('');
  const [amount, setAmount] = useState(50);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const vouchersQuery = query(
      collection(db, 'vouchers'),
      orderBy('createdAt', 'desc')
    );
    
    const unsubscribe = onSnapshot(vouchersQuery, (snapshot) => {
      const data: Voucher[] = [];
      snapshot.forEach((doc) => {
        data.push({ ...doc.data(), id: doc.id } as Voucher);
      });
      setVouchers(data);
      setLoading(false);
    });

    // Fetch users
    fetchUsers();

    return () => unsubscribe();
  }, []);

  const fetchUsers = async () => {
    const snapshot = await getDocs(collection(db, 'users'));
    const usersData: User[] = [];
    snapshot.forEach((doc) => {
      usersData.push({ ...doc.data(), id: doc.id } as User);
    });
    setUsers(usersData);
  };

  const handleCreateVoucher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !selectedUserId || !reason.trim()) return;

    const selectedUser = users.find(u => u.id === selectedUserId);
    if (!selectedUser) return;

    setSubmitting(true);
    try {
      await addDoc(collection(db, 'vouchers'), {
        userId: selectedUserId,
        userName: selectedUser.fullName,
        amount,
        reason: reason.trim(),
        status: 'pending',
        createdAt: serverTimestamp()
      });

      // Create notification
      await addDoc(collection(db, 'notifications'), {
        userId: selectedUserId,
        title: 'Voucher Reward!',
        message: `You have been awarded a R${amount} voucher for: ${reason}`,
        type: 'voucher',
        read: false,
        createdAt: serverTimestamp()
      });

      setSelectedUserId('');
      setAmount(50);
      setReason('');
      setShowForm(false);
    } catch (error) {
      console.error('Error creating voucher:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const updateVoucherStatus = async (voucherId: string, status: Voucher['status']) => {
    try {
      const updateData: Record<string, unknown> = { status };
      if (status === 'approved') {
        updateData.approvedAt = serverTimestamp();
      } else if (status === 'redeemed') {
        updateData.redeemedAt = serverTimestamp();
      }
      await updateDoc(doc(db, 'vouchers', voucherId), updateData);
    } catch (error) {
      console.error('Error updating voucher:', error);
    }
  };

  const filteredVouchers = filter === 'all' 
    ? vouchers 
    : vouchers.filter(v => v.status === filter);

  const stats = {
    total: vouchers.length,
    pending: vouchers.filter(v => v.status === 'pending').length,
    approved: vouchers.filter(v => v.status === 'approved').length,
    totalValue: vouchers
      .filter(v => v.status !== 'pending')
      .reduce((sum, v) => sum + v.amount, 0)
  };

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
            <Gift className="text-secondary" />
            Voucher Rewards
          </h1>
          <p className="text-muted mt-1">Manage employee voucher rewards</p>
        </div>
        
        <button
          onClick={() => setShowForm(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-secondary text-white rounded-lg hover:bg-secondary-hover transition-colors"
        >
          <Plus size={20} />
          Issue Voucher
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-card rounded-xl p-4">
          <p className="text-sm text-muted">Total Issued</p>
          <p className="text-2xl font-bold">{stats.total}</p>
        </div>
        <div className="bg-card rounded-xl p-4">
          <p className="text-sm text-muted">Pending</p>
          <p className="text-2xl font-bold text-accent">{stats.pending}</p>
        </div>
        <div className="bg-card rounded-xl p-4">
          <p className="text-sm text-muted">Approved</p>
          <p className="text-2xl font-bold text-secondary">{stats.approved}</p>
        </div>
        <div className="bg-card rounded-xl p-4">
          <p className="text-sm text-muted">Total Value</p>
          <p className="text-2xl font-bold">R{stats.totalValue}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {(['all', 'pending', 'approved', 'redeemed'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`
              px-4 py-2 rounded-lg text-sm font-medium transition-colors
              ${filter === f 
                ? 'bg-primary text-white' 
                : 'bg-card hover:bg-background'
              }
            `}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Vouchers List */}
      <div className="bg-card rounded-xl shadow-sm overflow-hidden">
        {filteredVouchers.length === 0 ? (
          <div className="p-12 text-center">
            <Gift className="mx-auto text-muted mb-4" size={48} />
            <p className="text-muted">No vouchers found</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filteredVouchers.map((voucher) => (
              <VoucherCard
                key={voucher.id}
                voucher={voucher}
                onApprove={() => updateVoucherStatus(voucher.id, 'approved')}
                onRedeem={() => updateVoucherStatus(voucher.id, 'redeemed')}
              />
            ))}
          </div>
        )}
      </div>

      {/* Create Voucher Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-xl p-6 shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Issue Voucher</h2>
              <button
                onClick={() => setShowForm(false)}
                className="p-2 hover:bg-background rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateVoucher} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Employee</label>
                <select
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  required
                  className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">Select employee</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.fullName} ({user.department})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Amount (R)</label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  min={10}
                  max={1000}
                  required
                  className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Reason</label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  required
                  rows={3}
                  className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                  placeholder="Why is this employee being rewarded?"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 text-muted hover:text-foreground transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-secondary text-white rounded-lg hover:bg-secondary-hover transition-colors disabled:opacity-50"
                >
                  {submitting ? 'Creating...' : 'Issue Voucher'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function VoucherCard({
  voucher,
  onApprove,
  onRedeem
}: {
  voucher: Voucher;
  onApprove: () => void;
  onRedeem: () => void;
}) {
  const formatDate = (date: Date | { toDate: () => Date } | undefined) => {
    if (!date) return '';
    const d = date instanceof Date ? date : date?.toDate?.() || new Date();
    return d.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getStatusIcon = () => {
    switch (voucher.status) {
      case 'pending':
        return <Clock className="text-accent" size={18} />;
      case 'approved':
        return <Check className="text-secondary" size={18} />;
      case 'redeemed':
        return <CheckCircle className="text-primary" size={18} />;
    }
  };

  return (
    <div className="flex items-center gap-4 p-4 hover:bg-background transition-colors">
      <div className="p-3 bg-secondary/10 rounded-lg">
        <Gift className="text-secondary" size={24} />
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-medium">{voucher.userName}</p>
          <span className={`
            flex items-center gap-1 px-2 py-0.5 text-xs rounded-full
            ${voucher.status === 'pending' ? 'bg-accent/20 text-accent' : ''}
            ${voucher.status === 'approved' ? 'bg-secondary/20 text-secondary' : ''}
            ${voucher.status === 'redeemed' ? 'bg-primary/20 text-primary' : ''}
          `}>
            {getStatusIcon()}
            {voucher.status}
          </span>
        </div>
        <p className="text-sm text-muted truncate">{voucher.reason}</p>
        <p className="text-xs text-muted-foreground mt-1">
          Created {formatDate(voucher.createdAt)}
        </p>
      </div>
      
      <div className="text-right">
        <p className="text-xl font-bold text-secondary">R{voucher.amount}</p>
        {voucher.status === 'pending' && (
          <button
            onClick={onApprove}
            className="mt-1 text-sm text-primary hover:underline"
          >
            Approve
          </button>
        )}
        {voucher.status === 'approved' && (
          <button
            onClick={onRedeem}
            className="mt-1 text-sm text-secondary hover:underline"
          >
            Mark Redeemed
          </button>
        )}
      </div>
    </div>
  );
}
