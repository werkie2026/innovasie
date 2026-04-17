'use client';

import { useEffect, useState } from 'react';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { User, BADGES } from '@/lib/types';
import { useAuth } from '@/lib/auth-context';
import { Trophy, Medal, Award, Crown, TrendingUp } from 'lucide-react';

export function Leaderboard() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeFilter, setTimeFilter] = useState<'all' | 'month' | 'week'>('all');

  useEffect(() => {
    fetchLeaderboard();
  }, [timeFilter]);

  const fetchLeaderboard = async () => {
    try {
      const usersQuery = query(
        collection(db, 'users'),
        orderBy('points', 'desc'),
        limit(50)
      );
      
      const snapshot = await getDocs(usersQuery);
      const usersData: User[] = [];
      snapshot.forEach((doc) => {
        usersData.push({ ...doc.data(), id: doc.id } as User);
      });
      setUsers(usersData);
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="text-yellow-500" size={24} />;
      case 2:
        return <Medal className="text-gray-400" size={24} />;
      case 3:
        return <Medal className="text-amber-600" size={24} />;
      default:
        return <span className="text-lg font-bold text-muted w-6 text-center">{rank}</span>;
    }
  };

  const currentUserRank = users.findIndex(u => u.id === currentUser?.id) + 1;

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
            <Trophy className="text-accent" />
            Leaderboard
          </h1>
          <p className="text-muted mt-1">Top innovators in your organization</p>
        </div>
        
        <div className="flex gap-2">
          {(['all', 'month', 'week'] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setTimeFilter(filter)}
              className={`
                px-4 py-2 rounded-lg text-sm font-medium transition-colors
                ${timeFilter === filter 
                  ? 'bg-primary text-white' 
                  : 'bg-card hover:bg-background'
                }
              `}
            >
              {filter === 'all' ? 'All Time' : filter === 'month' ? 'This Month' : 'This Week'}
            </button>
          ))}
        </div>
      </div>

      {/* Your Rank Card */}
      {currentUser && currentUserRank > 0 && (
        <div className="bg-gradient-to-r from-primary to-primary-hover rounded-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm opacity-80">Your Current Rank</p>
              <p className="text-4xl font-bold mt-1">#{currentUserRank}</p>
            </div>
            <div className="text-right">
              <p className="text-sm opacity-80">Your Points</p>
              <p className="text-4xl font-bold mt-1">{currentUser.points}</p>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2">
            <TrendingUp size={16} />
            <span className="text-sm">
              {currentUserRank <= 3 
                ? "You're in the top 3! Keep it up!" 
                : `${users[currentUserRank - 2]?.points - currentUser.points || 0} points to next rank`
              }
            </span>
          </div>
        </div>
      )}

      {/* Top 3 Podium */}
      {users.length >= 3 && (
        <div className="grid grid-cols-3 gap-4">
          {/* Second Place */}
          <div className="bg-card rounded-xl p-4 text-center mt-8">
            <div className="w-16 h-16 mx-auto bg-gray-200 rounded-full flex items-center justify-center mb-3">
              <span className="text-2xl font-bold text-gray-600">
                {users[1]?.fullName.charAt(0)}
              </span>
            </div>
            <Medal className="mx-auto text-gray-400 mb-2" size={28} />
            <p className="font-semibold truncate">{users[1]?.fullName}</p>
            <p className="text-sm text-muted">{users[1]?.department}</p>
            <p className="text-lg font-bold text-primary mt-2">{users[1]?.points} pts</p>
          </div>

          {/* First Place */}
          <div className="bg-gradient-to-b from-yellow-50 to-card rounded-xl p-4 text-center border-2 border-yellow-200">
            <div className="w-20 h-20 mx-auto bg-yellow-100 rounded-full flex items-center justify-center mb-3">
              <span className="text-3xl font-bold text-yellow-600">
                {users[0]?.fullName.charAt(0)}
              </span>
            </div>
            <Crown className="mx-auto text-yellow-500 mb-2" size={32} />
            <p className="font-bold text-lg truncate">{users[0]?.fullName}</p>
            <p className="text-sm text-muted">{users[0]?.department}</p>
            <p className="text-xl font-bold text-primary mt-2">{users[0]?.points} pts</p>
            <div className="flex justify-center gap-1 mt-2">
              {users[0]?.badges.slice(0, 4).map((badgeId) => {
                const badge = BADGES.find(b => b.id === badgeId);
                return badge ? (
                  <span key={badgeId} title={badge.name}>{badge.icon}</span>
                ) : null;
              })}
            </div>
          </div>

          {/* Third Place */}
          <div className="bg-card rounded-xl p-4 text-center mt-8">
            <div className="w-16 h-16 mx-auto bg-amber-100 rounded-full flex items-center justify-center mb-3">
              <span className="text-2xl font-bold text-amber-600">
                {users[2]?.fullName.charAt(0)}
              </span>
            </div>
            <Medal className="mx-auto text-amber-600 mb-2" size={28} />
            <p className="font-semibold truncate">{users[2]?.fullName}</p>
            <p className="text-sm text-muted">{users[2]?.department}</p>
            <p className="text-lg font-bold text-primary mt-2">{users[2]?.points} pts</p>
          </div>
        </div>
      )}

      {/* Full Leaderboard */}
      <div className="bg-card rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-border">
          <h2 className="font-semibold">All Rankings</h2>
        </div>
        <div className="divide-y divide-border">
          {users.map((user, index) => (
            <div 
              key={user.id}
              className={`
                flex items-center gap-4 p-4 hover:bg-background transition-colors
                ${user.id === currentUser?.id ? 'bg-primary/5' : ''}
              `}
            >
              <div className="w-8 flex justify-center">
                {getRankIcon(index + 1)}
              </div>
              
              <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="font-semibold text-primary">
                  {user.fullName.charAt(0)}
                </span>
              </div>
              
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">
                  {user.fullName}
                  {user.id === currentUser?.id && (
                    <span className="ml-2 text-xs bg-primary text-white px-2 py-0.5 rounded-full">
                      You
                    </span>
                  )}
                </p>
                <p className="text-sm text-muted truncate">{user.department}</p>
              </div>
              
              <div className="flex items-center gap-2">
                {user.badges.slice(0, 3).map((badgeId) => {
                  const badge = BADGES.find(b => b.id === badgeId);
                  return badge ? (
                    <span key={badgeId} title={badge.name} className="text-sm">
                      {badge.icon}
                    </span>
                  ) : null;
                })}
                {user.badges.length > 3 && (
                  <span className="text-xs text-muted">+{user.badges.length - 3}</span>
                )}
              </div>
              
              <div className="text-right">
                <p className="font-bold text-primary">{user.points}</p>
                <p className="text-xs text-muted">points</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
