'use client';

import { useEffect, useState } from 'react';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/auth-context';
import { Idea, Announcement, BADGES } from '@/lib/types';
import { Lightbulb, TrendingUp, Award, Users, Clock, ThumbsUp } from 'lucide-react';

export function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalIdeas: 0,
    approvedIdeas: 0,
    implementedIdeas: 0,
    totalUsers: 0,
  });
  const [recentIdeas, setRecentIdeas] = useState<Idea[]>([]);
  const [recentAnnouncements, setRecentAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, [user]);

  const fetchDashboardData = async () => {
    try {
      // Fetch stats
      const ideasSnap = await getDocs(collection(db, 'ideas'));
      const usersSnap = await getDocs(collection(db, 'users'));
      
      let approved = 0;
      let implemented = 0;
      
      ideasSnap.forEach((doc) => {
        const idea = doc.data() as Idea;
        if (idea.status === 'approved') approved++;
        if (idea.status === 'implemented') implemented++;
      });

      setStats({
        totalIdeas: ideasSnap.size,
        approvedIdeas: approved,
        implementedIdeas: implemented,
        totalUsers: usersSnap.size,
      });

      // Fetch recent ideas
      const recentIdeasQuery = query(
        collection(db, 'ideas'),
        orderBy('createdAt', 'desc'),
        limit(5)
      );
      const recentIdeasSnap = await getDocs(recentIdeasQuery);
      const ideas: Idea[] = [];
      recentIdeasSnap.forEach((doc) => {
        ideas.push({ ...doc.data(), id: doc.id } as Idea);
      });
      setRecentIdeas(ideas);

      // Fetch recent announcements
      const announcementsQuery = query(
        collection(db, 'announcements'),
        orderBy('createdAt', 'desc'),
        limit(3)
      );
      const announcementsSnap = await getDocs(announcementsQuery);
      const announcements: Announcement[] = [];
      announcementsSnap.forEach((doc) => {
        announcements.push({ ...doc.data(), id: doc.id } as Announcement);
      });
      setRecentAnnouncements(announcements);

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const userBadges = BADGES.filter(b => user?.badges.includes(b.id));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome banner */}
      <div className="bg-gradient-to-r from-primary to-primary-hover rounded-xl p-6 text-white">
        <h1 className="text-2xl font-bold mb-2">Welcome back, {user?.fullName}!</h1>
        <p className="opacity-90">You have {user?.points} points and {userBadges.length} badges. Keep innovating!</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Lightbulb}
          label="Total Ideas"
          value={stats.totalIdeas}
          color="bg-primary"
        />
        <StatCard
          icon={TrendingUp}
          label="Approved"
          value={stats.approvedIdeas}
          color="bg-secondary"
        />
        <StatCard
          icon={Award}
          label="Implemented"
          value={stats.implementedIdeas}
          color="bg-accent"
        />
        <StatCard
          icon={Users}
          label="Active Users"
          value={stats.totalUsers}
          color="bg-muted"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Ideas */}
        <div className="lg:col-span-2 bg-card rounded-xl p-6 shadow-sm">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Clock size={20} className="text-primary" />
            Recent Ideas
          </h2>
          <div className="space-y-3">
            {recentIdeas.length === 0 ? (
              <p className="text-muted text-center py-4">No ideas yet. Be the first to submit!</p>
            ) : (
              recentIdeas.map((idea) => (
                <div 
                  key={idea.id} 
                  className="flex items-center justify-between p-3 bg-background rounded-lg"
                >
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium truncate">{idea.title}</h3>
                    <p className="text-sm text-muted">{idea.authorName} • {idea.category}</p>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <span className={`
                      px-2 py-1 text-xs rounded-full font-medium
                      ${idea.status === 'pending' ? 'bg-accent/20 text-accent' : ''}
                      ${idea.status === 'approved' ? 'bg-secondary/20 text-secondary' : ''}
                      ${idea.status === 'implemented' ? 'bg-primary/20 text-primary' : ''}
                      ${idea.status === 'rejected' ? 'bg-danger/20 text-danger' : ''}
                    `}>
                      {idea.status}
                    </span>
                    <div className="flex items-center gap-1 text-muted">
                      <ThumbsUp size={14} />
                      <span className="text-sm">{idea.voteCount || 0}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* My Badges */}
        <div className="bg-card rounded-xl p-6 shadow-sm">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Award size={20} className="text-accent" />
            My Badges
          </h2>
          {userBadges.length === 0 ? (
            <p className="text-muted text-center py-4">No badges yet. Start contributing to earn badges!</p>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              {userBadges.map((badge) => (
                <div 
                  key={badge.id}
                  className="flex flex-col items-center p-3 bg-background rounded-lg text-center"
                  title={badge.description}
                >
                  <span className="text-2xl mb-1">{badge.icon}</span>
                  <span className="text-xs font-medium">{badge.name}</span>
                </div>
              ))}
            </div>
          )}
          
          {/* Progress to next badge */}
          <div className="mt-4 pt-4 border-t border-border">
            <p className="text-sm text-muted mb-2">Next badge at {getNextBadgePoints(user?.points || 0)} points</p>
            <div className="w-full bg-border rounded-full h-2">
              <div 
                className="bg-accent h-full rounded-full transition-all"
                style={{ width: `${getProgressToNextBadge(user?.points || 0)}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Recent Announcements */}
      {recentAnnouncements.length > 0 && (
        <div className="bg-card rounded-xl p-6 shadow-sm">
          <h2 className="text-lg font-semibold mb-4">Recent Announcements</h2>
          <div className="space-y-4">
            {recentAnnouncements.map((announcement) => (
              <div key={announcement.id} className="p-4 bg-background rounded-lg">
                <h3 className="font-medium">{announcement.title}</h3>
                <p className="text-sm text-muted mt-1 line-clamp-2">{announcement.content}</p>
                <p className="text-xs text-muted-foreground mt-2">
                  By {announcement.authorName}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ 
  icon: Icon, 
  label, 
  value, 
  color 
}: { 
  icon: React.ElementType; 
  label: string; 
  value: number; 
  color: string;
}) {
  return (
    <div className="bg-card rounded-xl p-6 shadow-sm">
      <div className="flex items-center gap-4">
        <div className={`${color} p-3 rounded-lg`}>
          <Icon className="text-white" size={24} />
        </div>
        <div>
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-sm text-muted">{label}</p>
        </div>
      </div>
    </div>
  );
}

function getNextBadgePoints(currentPoints: number): number {
  const thresholds = [100, 500, 1000];
  for (const threshold of thresholds) {
    if (currentPoints < threshold) return threshold;
  }
  return thresholds[thresholds.length - 1];
}

function getProgressToNextBadge(currentPoints: number): number {
  const thresholds = [0, 100, 500, 1000];
  for (let i = 1; i < thresholds.length; i++) {
    if (currentPoints < thresholds[i]) {
      const prev = thresholds[i - 1];
      const next = thresholds[i];
      return ((currentPoints - prev) / (next - prev)) * 100;
    }
  }
  return 100;
}
