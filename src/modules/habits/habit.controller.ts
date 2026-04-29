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
import { CreateHabitDto } from './dto/create-habit.dto';
import { HabitQueryDto } from './dto/habit-query.dto';
import { LogHabitDto } from './dto/log-habit.dto';
import { UpdateHabitDto } from './dto/update-habit.dto';
import { HabitsService } from './habit.service';

@ApiTags('Habits')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('habits')
export class HabitsController {
  constructor(private readonly habitsService: HabitsService) {}

  @Post()
  @ApiOperation({ summary: 'Habit yaratish' })
  create(
    @CurrentUser('sub') userId: string,
    @Body() dto: CreateHabitDto,
  ) {
    return this.habitsService.create(userId, dto);
  }

  @Get()
  @ApiOperation({ summary: "O'z habitlarini olish" })
  findAll(
    @CurrentUser('sub') userId: string,
    @Query() query: HabitQueryDto,
  ) {
    return this.habitsService.findAll(userId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Bitta habitni olish' })
  findOne(
    @CurrentUser('sub') userId: string,
    @Param('id') habitId: string,
  ) {
    return this.habitsService.findOne(userId, habitId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Habitni yangilash' })
  update(
    @CurrentUser('sub') userId: string,
    @Param('id') habitId: string,
    @Body() dto: UpdateHabitDto,
  ) {
    return this.habitsService.update(userId, habitId, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: "Habitni o'chirish" })
  remove(
    @CurrentUser('sub') userId: string,
    @Param('id') habitId: string,
  ) {
    return this.habitsService.remove(userId, habitId);
  }

  @Post(':id/log')
  @ApiOperation({ summary: "Habitni bajarildi deb belgilash" })
  logHabit(
    @CurrentUser('sub') userId: string,
    @Param('id') habitId: string,
    @Body() dto: LogHabitDto,
  ) {
    return this.habitsService.logHabit(userId, habitId, dto);
  }

  @Get(':id/logs')
  @ApiOperation({ summary: 'Habit loglarini olish' })
  getLogs(
    @CurrentUser('sub') userId: string,
    @Param('id') habitId: string,
  ) {
    return this.habitsService.getLogs(userId, habitId);
  }

  @Get(':id/streak')
  @ApiOperation({ summary: 'Streak hisoblash' })
  getStreak(
    @CurrentUser('sub') userId: string,
    @Param('id') habitId: string,
  ) {
    return this.habitsService.getStreak(userId, habitId);
  }
}