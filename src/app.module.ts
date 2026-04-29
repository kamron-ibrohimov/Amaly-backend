import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { validate } from './core/config/app.config';
import { MailModule } from './infrastructure/mail/mail.module';
import { PrismaModule } from './infrastructure/prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/user.module';
import { UploadModule } from './modules/upload/upload.module';
import { HabitsModule } from './modules/habits/habit.module';
import { CategoriesModule } from './modules/categories/category.module';
import { FollowsModule } from './modules/follows/follow.module';
import { FirebaseModule } from './infrastructure/firebase/firebase.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { CommentsModule } from './modules/comments/comment.module';
import { ReactionsModule } from './modules/reactions/reaction.module';
import { ChallengesModule } from './modules/challenges/challenge.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate,
    }),
    PrismaModule,
    AuthModule,
    MailModule,
    UsersModule,
    UploadModule,
    HabitsModule,
    CategoriesModule,
    FollowsModule,
    FirebaseModule,
    NotificationsModule,
    CommentsModule,
    ReactionsModule,
    ChallengesModule
  ],
})
export class AppModule {}