export type AccountStatus = 'active' | 'restricted' | 'banned';

export interface User {
  id: string;
  username: string | null;
  firstName: string;
  lastName: string | null;
  photoUrl: string | null;
  isAdmin: boolean;
  status: AccountStatus;
}

export interface TelegramAuthData {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
  hash: string;
}

export interface DealContact {
  info: string;
  social: string;
  public: boolean;
}

export interface Comment {
  id: string;
  author: string;
  text: string;
  createdAt: number;
}

export interface MediaItem {
  url: string;
  kind: 'image' | 'video';
}

export interface Deal {
  id: string;
  name: string;
  postedById?: string | null;
  circleId?: string | null;
  alsoGlobal?: boolean;
  contact?: DealContact | null;
  stage: string;
  origin: string;
  location: string;
  budget?: number | null;
  currency?: string | null;
  rate?: string;
  description: string;
  tag?: '' | 'Business' | 'VC';
  createdAt?: number;
  verifications?: number;
  disputes?: number;
  myVote?: 'verify' | 'dispute' | null;
  isMine?: boolean;
  cover?: MediaItem | null;
  mediaCount?: number;
  media?: MediaItem[];
  comments?: Comment[];
}

export interface PublicProfile {
  id: string;
  username: string | null;
  firstName: string;
  lastName: string | null;
  photoUrl: string | null;
  status: AccountStatus;
  isAdmin: boolean;
  isSelf: boolean;
  verificationsGiven: number;
  verificationsReceived: number;
  deals: Deal[];
}

export interface DirectoryUser {
  id: string;
  username: string | null;
  firstName: string;
  lastName: string | null;
  photoUrl: string | null;
  status: AccountStatus;
  isAdmin: boolean;
  postCount: number;
}

export interface CircleSummary {
  id: string;
  name: string;
  createdAt: number;
  memberCount: number;
  dealCount: number;
  verifiedCount: number;
  isCreator: boolean;
  isMember: boolean;
  isPending: boolean;
}

export interface CircleMember {
  id: string;
  role: 'creator' | 'member';
  joinedAt: number;
  username: string | null;
  firstName: string;
  photoUrl: string | null;
}

export interface CircleJoinRequest {
  id: string;
  username: string | null;
  firstName: string;
  photoUrl: string | null;
  createdAt: number;
  recommendedByName: string | null;
}

export interface CircleDetail extends CircleSummary {
  members?: CircleMember[];
  pendingRequests?: CircleJoinRequest[];
}
