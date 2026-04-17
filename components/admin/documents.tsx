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
  serverTimestamp
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/auth-context';
import { DocumentRequest, DOCUMENT_TYPES } from '@/lib/types';
import { FileText, Plus, X, Check, Clock, XCircle, Mail } from 'lucide-react';

export function DocumentRequests() {
  const { user: currentUser } = useAuth();
  const [requests, setRequests] = useState<DocumentRequest[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');

  // Form state
  const [documentType, setDocumentType] = useState(DOCUMENT_TYPES[0]);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Admin modal state
  const [processingRequest, setProcessingRequest] = useState<DocumentRequest | null>(null);
  const [adminNotes, setAdminNotes] = useState('');

  useEffect(() => {
    const requestsQuery = query(
      collection(db, 'documentRequests'),
      orderBy('createdAt', 'desc')
    );
    
    const unsubscribe = onSnapshot(requestsQuery, (snapshot) => {
      const data: DocumentRequest[] = [];
      snapshot.forEach((doc) => {
        data.push({ ...doc.data(), id: doc.id } as DocumentRequest);
      });
      setRequests(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !reason.trim()) return;

    setSubmitting(true);
    try {
      await addDoc(collection(db, 'documentRequests'), {
        userId: currentUser.id,
        userName: currentUser.fullName,
        userEmail: currentUser.email,
        documentType,
        reason: reason.trim(),
        status: 'pending',
        createdAt: serverTimestamp()
      });

      setDocumentType(DOCUMENT_TYPES[0]);
      setReason('');
      setShowForm(false);
    } catch (error) {
      console.error('Error submitting request:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const processRequest = async (status: 'approved' | 'rejected') => {
    if (!processingRequest) return;

    try {
      await updateDoc(doc(db, 'documentRequests', processingRequest.id), {
        status,
        adminNotes,
        processedAt: serverTimestamp()
      });

      // Create notification
      await addDoc(collection(db, 'notifications'), {
        userId: processingRequest.userId,
        title: `Document Request ${status === 'approved' ? 'Approved' : 'Rejected'}`,
        message: `Your request for ${processingRequest.documentType} has been ${status}. ${adminNotes ? `Notes: ${adminNotes}` : ''}`,
        type: 'system',
        read: false,
        createdAt: serverTimestamp()
      });

      setProcessingRequest(null);
      setAdminNotes('');
    } catch (error) {
      console.error('Error processing request:', error);
    }
  };

  const filteredRequests = filter === 'all' 
    ? requests 
    : requests.filter(r => r.status === filter);

  // For regular users, only show their own requests
  const displayRequests = currentUser?.role === 'admin' 
    ? filteredRequests 
    : filteredRequests.filter(r => r.userId === currentUser?.id);

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
            <FileText className="text-primary" />
            Document Requests
          </h1>
          <p className="text-muted mt-1">
            {currentUser?.role === 'admin' 
              ? 'Manage employee document requests'
              : 'Request official documents from HR'
            }
          </p>
        </div>
        
        {currentUser?.role !== 'admin' && (
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors"
          >
            <Plus size={20} />
            New Request
          </button>
        )}
      </div>

      {/* Stats for admins */}
      {currentUser?.role === 'admin' && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-card rounded-xl p-4">
            <p className="text-sm text-muted">Total Requests</p>
            <p className="text-2xl font-bold">{requests.length}</p>
          </div>
          <div className="bg-card rounded-xl p-4">
            <p className="text-sm text-muted">Pending</p>
            <p className="text-2xl font-bold text-accent">
              {requests.filter(r => r.status === 'pending').length}
            </p>
          </div>
          <div className="bg-card rounded-xl p-4">
            <p className="text-sm text-muted">Approved</p>
            <p className="text-2xl font-bold text-secondary">
              {requests.filter(r => r.status === 'approved').length}
            </p>
          </div>
          <div className="bg-card rounded-xl p-4">
            <p className="text-sm text-muted">Rejected</p>
            <p className="text-2xl font-bold text-danger">
              {requests.filter(r => r.status === 'rejected').length}
            </p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-2">
        {(['all', 'pending', 'approved', 'rejected'] as const).map((f) => (
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

      {/* Requests List */}
      <div className="bg-card rounded-xl shadow-sm overflow-hidden">
        {displayRequests.length === 0 ? (
          <div className="p-12 text-center">
            <FileText className="mx-auto text-muted mb-4" size={48} />
            <p className="text-muted">No document requests found</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {displayRequests.map((request) => (
              <RequestCard
                key={request.id}
                request={request}
                isAdmin={currentUser?.role === 'admin'}
                onProcess={() => setProcessingRequest(request)}
              />
            ))}
          </div>
        )}
      </div>

      {/* New Request Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-xl p-6 shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Request Document</h2>
              <button
                onClick={() => setShowForm(false)}
                className="p-2 hover:bg-background rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmitRequest} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Document Type</label>
                <select
                  value={documentType}
                  onChange={(e) => setDocumentType(e.target.value)}
                  className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {DOCUMENT_TYPES.map((type) => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Reason / Purpose</label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  required
                  rows={3}
                  className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                  placeholder="Why do you need this document?"
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
                  className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors disabled:opacity-50"
                >
                  {submitting ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Process Request Modal (Admin) */}
      {processingRequest && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-xl p-6 shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Process Request</h2>
              <button
                onClick={() => {
                  setProcessingRequest(null);
                  setAdminNotes('');
                }}
                className="p-2 hover:bg-background rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-3 mb-4">
              <div className="flex justify-between">
                <span className="text-muted">Employee:</span>
                <span className="font-medium">{processingRequest.userName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Document:</span>
                <span className="font-medium">{processingRequest.documentType}</span>
              </div>
              <div>
                <span className="text-muted">Reason:</span>
                <p className="mt-1">{processingRequest.reason}</p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Admin Notes (optional)</label>
              <textarea
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                rows={2}
                className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                placeholder="Add any notes for the employee..."
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <button
                onClick={() => processRequest('rejected')}
                className="px-4 py-2 bg-danger/10 text-danger rounded-lg hover:bg-danger/20 transition-colors"
              >
                Reject
              </button>
              <button
                onClick={() => processRequest('approved')}
                className="px-4 py-2 bg-secondary text-white rounded-lg hover:bg-secondary-hover transition-colors"
              >
                Approve
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function RequestCard({
  request,
  isAdmin,
  onProcess
}: {
  request: DocumentRequest;
  isAdmin?: boolean;
  onProcess: () => void;
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
    switch (request.status) {
      case 'pending':
        return <Clock className="text-accent" size={18} />;
      case 'approved':
        return <Check className="text-secondary" size={18} />;
      case 'rejected':
        return <XCircle className="text-danger" size={18} />;
    }
  };

  return (
    <div className="flex items-start gap-4 p-4 hover:bg-background transition-colors">
      <div className="p-3 bg-primary/10 rounded-lg">
        <FileText className="text-primary" size={24} />
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-medium">{request.documentType}</p>
          <span className={`
            flex items-center gap-1 px-2 py-0.5 text-xs rounded-full
            ${request.status === 'pending' ? 'bg-accent/20 text-accent' : ''}
            ${request.status === 'approved' ? 'bg-secondary/20 text-secondary' : ''}
            ${request.status === 'rejected' ? 'bg-danger/20 text-danger' : ''}
          `}>
            {getStatusIcon()}
            {request.status}
          </span>
        </div>
        
        {isAdmin && (
          <p className="text-sm text-muted flex items-center gap-1 mt-1">
            <Mail size={14} />
            {request.userName} ({request.userEmail})
          </p>
        )}
        
        <p className="text-sm text-muted mt-1">{request.reason}</p>
        
        {request.adminNotes && (
          <p className="text-sm text-primary mt-2 p-2 bg-primary/5 rounded">
            Admin: {request.adminNotes}
          </p>
        )}
        
        <p className="text-xs text-muted-foreground mt-2">
          Requested {formatDate(request.createdAt)}
          {request.processedAt && ` • Processed ${formatDate(request.processedAt)}`}
        </p>
      </div>
      
      {isAdmin && request.status === 'pending' && (
        <button
          onClick={onProcess}
          className="px-3 py-1.5 bg-primary text-white text-sm rounded-lg hover:bg-primary-hover transition-colors"
        >
          Process
        </button>
      )}
    </div>
  );
}
