export interface User {
  id: string;
  email: string;
  fullName: string;
  department: string;
  role: 'admin' | 'user';
  points: number;
  badges: string[];
  createdAt: Date;
  lastLogin?: Date;
}

export interface Idea {
  id: string;
  title: string;
  description: string;
  category: string;
  authorId: string;
  authorName: string;
  authorDepartment: string;
  status: 'pending' | 'approved' | 'implemented' | 'rejected';
  votes: string[];
  voteCount: number;
  impactRating?: number;
  adminFeedback?: string;
  createdAt: Date;
  updatedAt?: Date;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  authorId: string;
  authorName: string;
  isPoll: boolean;
  pollOptions?: PollOption[];
  createdAt: Date;
}

export interface PollOption {
  text: string;
  votes: string[];
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  requirement: string;
  pointsRequired?: number;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'idea' | 'badge' | 'voucher' | 'announcement' | 'system';
  read: boolean;
  createdAt: Date;
}

export interface Voucher {
  id: string;
  userId: string;
  userName: string;
  amount: number;
  reason: string;
  status: 'pending' | 'approved' | 'redeemed';
  createdAt: Date;
  approvedAt?: Date;
  redeemedAt?: Date;
}

export interface DocumentRequest {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  documentType: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: Date;
  processedAt?: Date;
  adminNotes?: string;
}

export const BADGES: Badge[] = [
  { id: 'first-idea', name: 'Innovator', description: 'Submitted your first idea', icon: '💡', requirement: 'Submit 1 idea' },
  { id: 'five-ideas', name: 'Idea Machine', description: 'Submitted 5 ideas', icon: '🚀', requirement: 'Submit 5 ideas' },
  { id: 'ten-votes', name: 'Supporter', description: 'Voted on 10 ideas', icon: '👍', requirement: 'Vote on 10 ideas' },
  { id: 'first-approved', name: 'Approved!', description: 'Had an idea approved', icon: '✅', requirement: 'Get an idea approved' },
  { id: 'implemented', name: 'Game Changer', description: 'Had an idea implemented', icon: '🏆', requirement: 'Get an idea implemented' },
  { id: 'points-100', name: 'Century Club', description: 'Earned 100 points', icon: '💯', requirement: 'Earn 100 points', pointsRequired: 100 },
  { id: 'points-500', name: 'High Achiever', description: 'Earned 500 points', icon: '⭐', requirement: 'Earn 500 points', pointsRequired: 500 },
];

export const CATEGORIES = [
  'Process Improvement',
  'Cost Savings',
  'Customer Experience',
  'Employee Wellbeing',
  'Technology',
  'Sustainability',
  'Other',
];

export const DEPARTMENTS = [
  'Engineering',
  'Marketing',
  'Sales',
  'Human Resources',
  'Finance',
  'Operations',
  'Customer Support',
  'Product',
  'Other',
];

export const DOCUMENT_TYPES = [
  'Employment Verification',
  'Salary Certificate',
  'Experience Letter',
  'Recommendation Letter',
  'Tax Documents',
  'Other',
];
