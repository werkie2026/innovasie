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
  arrayUnion
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/auth-context';
import { Announcement, PollOption } from '@/lib/types';
import { Megaphone, Plus, X, BarChart3, Check } from 'lucide-react';

export function Announcements() {
  const { user } = useAuth();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);

  // Form state
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isPoll, setIsPoll] = useState(false);
  const [pollOptions, setPollOptions] = useState<string[]>(['', '']);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const announcementsQuery = query(
      collection(db, 'announcements'),
      orderBy('createdAt', 'desc')
    );
    
    const unsubscribe = onSnapshot(announcementsQuery, (snapshot) => {
      const data: Announcement[] = [];
      snapshot.forEach((doc) => {
        data.push({ ...doc.data(), id: doc.id } as Announcement);
      });
      setAnnouncements(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || user.role !== 'admin' || !title.trim() || !content.trim()) return;

    setSubmitting(true);
    try {
      const announcementData: Partial<Announcement> = {
        title: title.trim(),
        content: content.trim(),
        authorId: user.id,
        authorName: user.fullName,
        isPoll,
        createdAt: new Date(),
      };

      if (isPoll) {
        announcementData.pollOptions = pollOptions
          .filter(opt => opt.trim())
          .map(text => ({ text: text.trim(), votes: [] }));
      }

      await addDoc(collection(db, 'announcements'), {
        ...announcementData,
        createdAt: serverTimestamp()
      });

      setTitle('');
      setContent('');
      setIsPoll(false);
      setPollOptions(['', '']);
      setShowForm(false);
    } catch (error) {
      console.error('Error creating announcement:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleVote = async (announcementId: string, optionIndex: number) => {
    if (!user) return;

    const announcement = announcements.find(a => a.id === announcementId);
    if (!announcement?.pollOptions) return;

    // Check if user already voted
    const hasVoted = announcement.pollOptions.some(opt => opt.votes.includes(user.id));
    if (hasVoted) return;

    const updatedOptions = announcement.pollOptions.map((opt, idx) => {
      if (idx === optionIndex) {
        return { ...opt, votes: [...opt.votes, user.id] };
      }
      return opt;
    });

    try {
      await updateDoc(doc(db, 'announcements', announcementId), {
        pollOptions: updatedOptions
      });
    } catch (error) {
      console.error('Error voting:', error);
    }
  };

  const addPollOption = () => {
    if (pollOptions.length < 6) {
      setPollOptions([...pollOptions, '']);
    }
  };

  const removePollOption = (index: number) => {
    if (pollOptions.length > 2) {
      setPollOptions(pollOptions.filter((_, i) => i !== index));
    }
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
            <Megaphone className="text-primary" />
            Announcements
          </h1>
          <p className="text-muted mt-1">Stay updated with company news and polls</p>
        </div>
        
        {user?.role === 'admin' && (
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors"
          >
            <Plus size={20} />
            New Announcement
          </button>
        )}
      </div>

      {/* Announcements List */}
      <div className="space-y-4">
        {announcements.length === 0 ? (
          <div className="bg-card rounded-xl p-12 text-center">
            <Megaphone className="mx-auto text-muted mb-4" size={48} />
            <p className="text-muted">No announcements yet</p>
          </div>
        ) : (
          announcements.map((announcement) => (
            <AnnouncementCard
              key={announcement.id}
              announcement={announcement}
              userId={user?.id}
              onVote={(optionIndex) => handleVote(announcement.id, optionIndex)}
            />
          ))
        )}
      </div>

      {/* Create Announcement Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-xl p-6 shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">New Announcement</h2>
              <button
                onClick={() => setShowForm(false)}
                className="p-2 hover:bg-background rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Announcement title"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Content</label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  required
                  rows={4}
                  className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                  placeholder="Write your announcement..."
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isPoll"
                  checked={isPoll}
                  onChange={(e) => setIsPoll(e.target.checked)}
                  className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                />
                <label htmlFor="isPoll" className="text-sm font-medium">
                  Include a poll
                </label>
              </div>

              {isPoll && (
                <div className="space-y-2">
                  <label className="block text-sm font-medium">Poll Options</label>
                  {pollOptions.map((option, index) => (
                    <div key={index} className="flex gap-2">
                      <input
                        type="text"
                        value={option}
                        onChange={(e) => {
                          const newOptions = [...pollOptions];
                          newOptions[index] = e.target.value;
                          setPollOptions(newOptions);
                        }}
                        className="flex-1 px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                        placeholder={`Option ${index + 1}`}
                      />
                      {pollOptions.length > 2 && (
                        <button
                          type="button"
                          onClick={() => removePollOption(index)}
                          className="p-2 text-danger hover:bg-danger/10 rounded-lg transition-colors"
                        >
                          <X size={20} />
                        </button>
                      )}
                    </div>
                  ))}
                  {pollOptions.length < 6 && (
                    <button
                      type="button"
                      onClick={addPollOption}
                      className="text-sm text-primary hover:underline"
                    >
                      + Add option
                    </button>
                  )}
                </div>
              )}

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
                  {submitting ? 'Posting...' : 'Post Announcement'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function AnnouncementCard({ 
  announcement, 
  userId,
  onVote 
}: { 
  announcement: Announcement; 
  userId?: string;
  onVote: (optionIndex: number) => void;
}) {
  const hasVoted = announcement.pollOptions?.some(opt => opt.votes.includes(userId || ''));
  const totalVotes = announcement.pollOptions?.reduce((sum, opt) => sum + opt.votes.length, 0) || 0;

  const formatDate = (date: Date | { toDate: () => Date }) => {
    const d = date instanceof Date ? date : date?.toDate?.() || new Date();
    return d.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <div className="bg-card rounded-xl p-6 shadow-sm">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-semibold text-lg">{announcement.title}</h3>
          <p className="text-sm text-muted">
            {announcement.authorName} • {formatDate(announcement.createdAt)}
          </p>
        </div>
        {announcement.isPoll && (
          <span className="flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary text-xs rounded-full">
            <BarChart3 size={14} />
            Poll
          </span>
        )}
      </div>

      <p className="text-card-foreground whitespace-pre-wrap mb-4">{announcement.content}</p>

      {announcement.isPoll && announcement.pollOptions && (
        <div className="space-y-2 pt-4 border-t border-border">
          {announcement.pollOptions.map((option, index) => {
            const percentage = totalVotes > 0 
              ? Math.round((option.votes.length / totalVotes) * 100) 
              : 0;
            const userVoted = option.votes.includes(userId || '');

            return (
              <button
                key={index}
                onClick={() => !hasVoted && onVote(index)}
                disabled={hasVoted}
                className={`
                  w-full p-3 rounded-lg text-left relative overflow-hidden transition-colors
                  ${hasVoted 
                    ? 'bg-background cursor-default' 
                    : 'bg-background hover:bg-primary/5 cursor-pointer'
                  }
                `}
              >
                {hasVoted && (
                  <div 
                    className="absolute inset-y-0 left-0 bg-primary/10 transition-all"
                    style={{ width: `${percentage}%` }}
                  />
                )}
                <div className="relative flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    {userVoted && <Check size={16} className="text-primary" />}
                    {option.text}
                  </span>
                  {hasVoted && (
                    <span className="text-sm font-medium">{percentage}%</span>
                  )}
                </div>
              </button>
            );
          })}
          <p className="text-xs text-muted text-center mt-2">
            {totalVotes} vote{totalVotes !== 1 ? 's' : ''}
          </p>
        </div>
      )}
    </div>
  );
}
