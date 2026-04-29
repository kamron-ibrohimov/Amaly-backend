import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { FollowsController } from './follow.controller';
import { FollowsService } from './follow.service';

@Module({
  imports: [NotificationsModule], // ← qo'sh
  controllers: [FollowsController],
  providers: [FollowsService],
  exports: [FollowsService],
})
export class FollowsModule {}