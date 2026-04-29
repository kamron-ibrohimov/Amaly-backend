import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../core/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../core/guards/jwt-auth.guard';
import { ChallengesService } from './challenge.service';
import { ChallengeQueryDto } from './dto/challenge-query.dto';
import { CreateChallengeDto } from './dto/create-challenge.dto';
import { InviteUserDto } from './dto/invite-user.dto';
import { UpdateChallengeDto } from './dto/update-challenge.dto';

@ApiTags('Challenges')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('challenges')
export class ChallengesController {
  constructor(private readonly challengesService: ChallengesService) {}

  @Post()
  @ApiOperation({ summary: 'Challenge yaratish' })
  create(@CurrentUser('id') userId: string, @Body() dto: CreateChallengeDto) {
    return this.challengesService.create(userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Challengelar ro\'yxati' })
  findAll(@CurrentUser('id') userId: string, @Query() query: ChallengeQueryDto) {
    return this.challengesService.findAll(userId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Bitta challenge' })
  findOne(@CurrentUser('id') userId: string, @Param('id') challengeId: string) {
    return this.challengesService.findOne(userId, challengeId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Challengeni tahrirlash (faqat creator)' })
  update(
    @CurrentUser('id') userId: string,
    @Param('id') challengeId: string,
    @Body() dto: UpdateChallengeDto,
  ) {
    return this.challengesService.update(userId, challengeId, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Challengeni o\'chirish (faqat creator)' })
  remove(@CurrentUser('id') userId: string, @Param('id') challengeId: string) {
    return this.challengesService.remove(userId, challengeId);
  }

  @Post(':id/invite')
  @ApiOperation({ summary: 'Foydalanuvchini invite qilish (faqat creator)' })
  inviteUser(
    @CurrentUser('id') userId: string,
    @Param('id') challengeId: string,
    @Body() dto: InviteUserDto,
  ) {
    return this.challengesService.inviteUser(userId, challengeId, dto);
  }

  @Post(':id/accept')
  @ApiOperation({ summary: 'Challengega qo\'shilish (invite qabul qilish)' })
  acceptInvite(@CurrentUser('id') userId: string, @Param('id') challengeId: string) {
    return this.challengesService.acceptInvite(userId, challengeId);
  }

  @Delete(':id/leave')
  @ApiOperation({ summary: 'Challengedan chiqish yoki rad etish' })
  leaveOrReject(@CurrentUser('id') userId: string, @Param('id') challengeId: string) {
    return this.challengesService.leaveOrReject(userId, challengeId);
  }

  @Post(':id/habits/:habitId')
  @ApiOperation({ summary: 'Habitni challengega qo\'shish (faqat creator)' })
  addHabit(
    @CurrentUser('id') userId: string,
    @Param('id') challengeId: string,
    @Param('habitId') habitId: string,
  ) {
    return this.challengesService.addHabit(userId, challengeId, habitId);
  }

  @Delete(':id/habits/:habitId')
  @ApiOperation({ summary: 'Habitni challengedan olib tashlash (faqat creator)' })
  removeHabit(
    @CurrentUser('id') userId: string,
    @Param('id') challengeId: string,
    @Param('habitId') habitId: string,
  ) {
    return this.challengesService.removeHabit(userId, challengeId, habitId);
  }

  @Get(':id/members')
  @ApiOperation({ summary: 'Challenge ishtirokchilari' })
  getMembers(@CurrentUser('id') userId: string, @Param('id') challengeId: string) {
    return this.challengesService.getMembers(userId, challengeId);
  }
}