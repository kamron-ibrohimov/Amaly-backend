import { Module } from '@nestjs/common';
import { PrismaModule } from '../../infrastructure/prisma/prisma.module';
import { HabitsController } from './habit.controller';
import { HabitsService } from './habit.service';

@Module({
  imports: [PrismaModule],
  controllers: [HabitsController],
  providers: [HabitsService],
  exports: [HabitsService],
})
export class HabitsModule {}