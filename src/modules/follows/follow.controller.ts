import {
  Controller,
  Post,
  Delete,
  Get,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../core/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../core/guards/jwt-auth.guard';
import { FollowersQueryDto } from './dto/followers-query.dto';
import { FollowsService } from './follow.service';

@ApiTags('Follows')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('follows')
export class FollowsController {
  constructor(private readonly followsService: FollowsService) {}

  // POST /follows/:userId
  @Post(':userId')
  @ApiOperation({ summary: 'Follow qilish' })
  follow(
    @CurrentUser('id') currentUserId: string,
    @Param('userId') targetUserId: string,
  ) {
    return this.followsService.follow(currentUserId, targetUserId);
  }

  // DELETE /follows/:userId
  @Delete(':userId')
  @ApiOperation({ summary: 'Unfollow qilish' })
  unfollow(
    @CurrentUser('id') currentUserId: string,
    @Param('userId') targetUserId: string,
  ) {
    return this.followsService.unfollow(currentUserId, targetUserId);
  }

  // POST /follows/requests/:followerId/accept
  @Post('requests/:followerId/accept')
  @ApiOperation({ summary: 'Follow so\'rovini qabul qilish' })
  acceptRequest(
    @CurrentUser('id') currentUserId: string,
    @Param('followerId') followerId: string,
  ) {
    return this.followsService.acceptRequest(currentUserId, followerId);
  }

  // POST /follows/requests/:followerId/reject
  @Post('requests/:followerId/reject')
  @ApiOperation({ summary: 'Follow so\'rovini rad etish' })
  rejectRequest(
    @CurrentUser('id') currentUserId: string,
    @Param('followerId') followerId: string,
  ) {
    return this.followsService.rejectRequest(currentUserId, followerId);
  }

  // GET /follows/requests/pending
  @Get('requests/pending')
  @ApiOperation({ summary: 'Kelib tushgan follow so\'rovlar' })
  getPendingRequests(
    @CurrentUser('id') currentUserId: string,
    @Query() query: FollowersQueryDto,
  ) {
    return this.followsService.getPendingRequests(currentUserId, query);
  }

  // GET /follows/:userId/followers
  @Get(':userId/followers')
  @ApiOperation({ summary: 'Followers ro\'yxati' })
  getFollowers(
    @CurrentUser('id') currentUserId: string,
    @Param('userId') targetUserId: string,
    @Query() query: FollowersQueryDto,
  ) {
    return this.followsService.getFollowers(currentUserId, targetUserId, query);
  }

  // GET /follows/:userId/following
  @Get(':userId/following')
  @ApiOperation({ summary: 'Following ro\'yxati' })
  getFollowing(
    @CurrentUser('id') currentUserId: string,
    @Param('userId') targetUserId: string,
    @Query() query: FollowersQueryDto,
  ) {
    return this.followsService.getFollowing(currentUserId, targetUserId, query);
  }
}