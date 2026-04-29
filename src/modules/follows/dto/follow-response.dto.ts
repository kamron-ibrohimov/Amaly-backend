export interface FollowResponseDto {
  id: string;
  followerId: string;
  followingId: string;
  status: 'PENDING' | 'ACCEPTED';
  createdAt: Date;
}