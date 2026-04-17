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
  arrayUnion,
  arrayRemove,
  increment
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/auth-context';
import { Idea, CATEGORIES, BADGES } from '@/lib/types';
import { 
  Plus, 
  X, 
  ThumbsUp, 
  Filter, 
  Search,
  MessageSquare,
  Star
} from 'lucide-react';

export function Ideas() {
  const { user, addPoints, awardBadge } = useAuth();
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [selectedIdea, setSelectedIdea] = useState<Idea | null>(null);
  const [filter, setFilter] = useState({ status: 'all', category: 'all', search: '' });
  const [loading, setLoading] = useState(true);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const ideasQuery = query(collection(db, 'ideas'), orderBy('createdAt', 'desc'));
    
    const unsubscribe = onSnapshot(ideasQuery, (snapshot) => {
      const ideasData: Idea[] = [];
      snapshot.forEach((doc) => {
        ideasData.push({ ...doc.data(), id: doc.id } as Idea);
      });
      setIdeas(ideasData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleSubmitIdea = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !title.trim() || !description.trim()) return;

    setSubmitting(true);
    try {
      await addDoc(collection(db, 'ideas'), {
        title: title.trim(),
        description: description.trim(),
        category,
        authorId: user.id,
        authorName: user.fullName,
        authorDepartment: user.department,
        status: 'pending',
        votes: [],
        voteCount: 0,
        createdAt: serverTimestamp(),
      });

      // Award points and check for badges
      await addPoints(10, 'Submitted an idea');
      
      // Check for first idea badge
      const userIdeas = ideas.filter(i => i.authorId === user.id);
      if (userIdeas.length === 0) {
        await awardBadge('first-idea');
      }
      if (userIdeas.length === 4) {
        await awardBadge('five-ideas');
      }

      setTitle('');
      setDescription('');
      setCategory(CATEGORIES[0]);
      setShowForm(false);
    } catch (error) {
      console.error('Error submitting idea:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleVote = async (idea: Idea) => {
    if (!user) return;
    
    const ideaRef = doc(db, 'ideas', idea.id);
    const hasVoted = idea.votes?.includes(user.id);

    try {
      if (hasVoted) {
        await updateDoc(ideaRef, {
          votes: arrayRemove(user.id),
          voteCount: increment(-1)
        });
      } else {
        await updateDoc(ideaRef, {
          votes: arrayUnion(user.id),
          voteCount: increment(1)
        });
        
        // Check for voter badges
        const userVotes = ideas.filter(i => i.votes?.includes(user.id)).length;
        if (userVotes === 9) {
          await awardBadge('ten-votes');
        }
      }
    } catch (error) {
      console.error('Error voting:', error);
    }
  };

  const filteredIdeas = ideas.filter((idea) => {
    if (filter.status !== 'all' && idea.status !== filter.status) return false;
    if (filter.category !== 'all' && idea.category !== filter.category) return false;
    if (filter.search && !idea.title.toLowerCase().includes(filter.search.toLowerCase()) &&
        !idea.description.toLowerCase().includes(filter.search.toLowerCase())) return false;
    return true;
  });

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
        <h1 className="text-2xl font-bold">Innovation Ideas</h1>
        <button
          onClick={() => setShowForm(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors"
        >
          <Plus size={20} />
          Submit Idea
        </button>
      </div>

      {/* Filters */}
      <div className="bg-card rounded-xl p-4 shadow-sm">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={20} />
            <input
              type="text"
              placeholder="Search ideas..."
              value={filter.search}
              onChange={(e) => setFilter({ ...filter, search: e.target.value })}
              className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={filter.status}
              onChange={(e) => setFilter({ ...filter, status: e.target.value })}
              className="px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="implemented">Implemented</option>
              <option value="rejected">Rejected</option>
            </select>
            <select
              value={filter.category}
              onChange={(e) => setFilter({ ...filter, category: e.target.value })}
              className="px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="all">All Categories</option>
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Ideas Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredIdeas.length === 0 ? (
          <div className="col-span-full text-center py-12 text-muted">
            No ideas found. Be the first to submit one!
          </div>
        ) : (
          filteredIdeas.map((idea) => (
            <IdeaCard
              key={idea.id}
              idea={idea}
              userId={user?.id}
              onVote={() => handleVote(idea)}
              onClick={() => setSelectedIdea(idea)}
            />
          ))
        )}
      </div>

      {/* Submit Idea Modal */}
      {showForm && (
        <Modal onClose={() => setShowForm(false)}>
          <h2 className="text-xl font-bold mb-4">Submit New Idea</h2>
          <form onSubmit={handleSubmitIdea} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Give your idea a catchy title"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
                rows={4}
                className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                placeholder="Describe your idea in detail..."
              />
            </div>
            <div className="flex justify-end gap-3">
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
                {submitting ? 'Submitting...' : 'Submit Idea'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Idea Detail Modal */}
      {selectedIdea && (
        <IdeaDetailModal 
          idea={selectedIdea} 
          userId={user?.id}
          userRole={user?.role}
          onClose={() => setSelectedIdea(null)}
          onVote={() => handleVote(selectedIdea)}
        />
      )}
    </div>
  );
}

function IdeaCard({ 
  idea, 
  userId, 
  onVote, 
  onClick 
}: { 
  idea: Idea; 
  userId?: string;
  onVote: () => void;
  onClick: () => void;
}) {
  const hasVoted = idea.votes?.includes(userId || '');
  
  return (
    <div className="bg-card rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <span className={`
          px-2 py-1 text-xs rounded-full font-medium
          ${idea.status === 'pending' ? 'bg-accent/20 text-accent' : ''}
          ${idea.status === 'approved' ? 'bg-secondary/20 text-secondary' : ''}
          ${idea.status === 'implemented' ? 'bg-primary/20 text-primary' : ''}
          ${idea.status === 'rejected' ? 'bg-danger/20 text-danger' : ''}
        `}>
          {idea.status}
        </span>
        <span className="text-xs text-muted">{idea.category}</span>
      </div>
      
      <h3 
        className="font-semibold mb-2 cursor-pointer hover:text-primary transition-colors"
        onClick={onClick}
      >
        {idea.title}
      </h3>
      
      <p className="text-sm text-muted line-clamp-2 mb-4">{idea.description}</p>
      
      <div className="flex items-center justify-between pt-3 border-t border-border">
        <div className="text-sm text-muted">
          <span className="font-medium text-foreground">{idea.authorName}</span>
          <span className="mx-1">•</span>
          <span>{idea.authorDepartment}</span>
        </div>
        
        <button
          onClick={(e) => {
            e.stopPropagation();
            onVote();
          }}
          className={`
            flex items-center gap-1 px-3 py-1.5 rounded-lg transition-colors
            ${hasVoted 
              ? 'bg-primary text-white' 
              : 'bg-background hover:bg-primary/10 text-muted hover:text-primary'
            }
          `}
        >
          <ThumbsUp size={16} />
          <span className="text-sm font-medium">{idea.voteCount || 0}</span>
        </button>
      </div>
      
      {idea.impactRating && (
        <div className="flex items-center gap-1 mt-3 pt-3 border-t border-border">
          <Star className="text-accent" size={16} />
          <span className="text-sm">Impact: {idea.impactRating}/5</span>
        </div>
      )}
    </div>
  );
}

function IdeaDetailModal({ 
  idea, 
  userId,
  userRole,
  onClose, 
  onVote 
}: { 
  idea: Idea; 
  userId?: string;
  userRole?: string;
  onClose: () => void;
  onVote: () => void;
}) {
  const [feedback, setFeedback] = useState(idea.adminFeedback || '');
  const [status, setStatus] = useState(idea.status);
  const [impactRating, setImpactRating] = useState(idea.impactRating || 0);
  const [saving, setSaving] = useState(false);
  const hasVoted = idea.votes?.includes(userId || '');
  const isAdmin = userRole === 'admin';

  const handleSaveAdmin = async () => {
    setSaving(true);
    try {
      await updateDoc(doc(db, 'ideas', idea.id), {
        status,
        adminFeedback: feedback,
        impactRating,
        updatedAt: serverTimestamp()
      });
      onClose();
    } catch (error) {
      console.error('Error updating idea:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal onClose={onClose} large>
      <div className="space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <span className={`
              px-2 py-1 text-xs rounded-full font-medium
              ${idea.status === 'pending' ? 'bg-accent/20 text-accent' : ''}
              ${idea.status === 'approved' ? 'bg-secondary/20 text-secondary' : ''}
              ${idea.status === 'implemented' ? 'bg-primary/20 text-primary' : ''}
              ${idea.status === 'rejected' ? 'bg-danger/20 text-danger' : ''}
            `}>
              {idea.status}
            </span>
            <h2 className="text-xl font-bold mt-2">{idea.title}</h2>
          </div>
        </div>

        <div className="text-sm text-muted">
          <span className="font-medium text-foreground">{idea.authorName}</span>
          <span className="mx-2">•</span>
          <span>{idea.authorDepartment}</span>
          <span className="mx-2">•</span>
          <span>{idea.category}</span>
        </div>

        <p className="text-card-foreground whitespace-pre-wrap">{idea.description}</p>

        <div className="flex items-center gap-4 py-4 border-y border-border">
          <button
            onClick={onVote}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-lg transition-colors
              ${hasVoted 
                ? 'bg-primary text-white' 
                : 'bg-background hover:bg-primary/10 text-muted hover:text-primary'
              }
            `}
          >
            <ThumbsUp size={18} />
            <span className="font-medium">{idea.voteCount || 0} votes</span>
          </button>
          
          {idea.impactRating && (
            <div className="flex items-center gap-1">
              <Star className="text-accent" size={18} />
              <span>Impact Rating: {idea.impactRating}/5</span>
            </div>
          )}
        </div>

        {idea.adminFeedback && !isAdmin && (
          <div className="bg-background p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <MessageSquare size={16} className="text-primary" />
              <span className="font-medium">Admin Feedback</span>
            </div>
            <p className="text-sm text-muted">{idea.adminFeedback}</p>
          </div>
        )}

        {isAdmin && (
          <div className="space-y-4 pt-4 border-t border-border">
            <h3 className="font-semibold">Admin Actions</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as Idea['status'])}
                  className="w-full px-4 py-2 bg-background border border-border rounded-lg"
                >
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="implemented">Implemented</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Impact Rating</label>
                <select
                  value={impactRating}
                  onChange={(e) => setImpactRating(Number(e.target.value))}
                  className="w-full px-4 py-2 bg-background border border-border rounded-lg"
                >
                  <option value={0}>Not rated</option>
                  <option value={1}>1 - Low</option>
                  <option value={2}>2</option>
                  <option value={3}>3 - Medium</option>
                  <option value={4}>4</option>
                  <option value={5}>5 - High</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Feedback</label>
              <textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                rows={3}
                className="w-full px-4 py-2 bg-background border border-border rounded-lg resize-none"
                placeholder="Provide feedback on this idea..."
              />
            </div>

            <div className="flex justify-end">
              <button
                onClick={handleSaveAdmin}
                disabled={saving}
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

function Modal({ 
  children, 
  onClose, 
  large = false 
}: { 
  children: React.ReactNode; 
  onClose: () => void;
  large?: boolean;
}) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div 
        className={`bg-card rounded-xl p-6 shadow-xl w-full ${large ? 'max-w-2xl' : 'max-w-md'} max-h-[90vh] overflow-y-auto`}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 hover:bg-background rounded-lg transition-colors"
        >
          <X size={20} />
        </button>
        {children}
      </div>
    </div>
  );
}
