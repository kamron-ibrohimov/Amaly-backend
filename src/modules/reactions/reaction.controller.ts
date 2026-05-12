import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../core/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../core/guards/jwt-auth.guard';
import { CreateReactionDto } from './dto/create-reaction.dto';
import { ReactionsService } from './reaction.service';

@ApiTags('Reactions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('habits/:habitId/reactions')
export class ReactionsController {
  constructor(private readonly reactionsService: ReactionsService) {}

  @Post()
  @ApiOperation({ summary: 'Reaksiya qo\'yish yoki almashtirish' })
  react(
    @CurrentUser('id') userId: string,
    @Param('habitId') habitId: string,
    @Body() dto: CreateReactionDto,
  ) {
    return this.reactionsService.react(userId, habitId, dto);
  }

  // DELETE /habits/:habitId/reactions
  @Delete()
  @ApiOperation({ summary: 'Reaksiyani olib tashlash' })
  remove(
    @CurrentUser('id') userId: string,
    @Param('habitId') habitId: string,
  ) {
    return this.reactionsService.remove(userId, habitId);
  }

  // GET /habits/:habitId/reactions
  @Get()
  @ApiOperation({ summary: 'Reaksiyalar ro\'yxati' })
  findAll(
    @CurrentUser('id') userId: string,
    @Param('habitId') habitId: string,
  ) {
    return this.reactionsService.findAll(userId, habitId);
  }
}