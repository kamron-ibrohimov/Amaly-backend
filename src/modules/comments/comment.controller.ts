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
import { CommentsService } from './comment.service';
import { CommentQueryDto } from './dto/comment-query.dto';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';

@ApiTags('Comments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  // POST /habits/:habitId/comments
  @Post('habits/:habitId/comments')
  @ApiOperation({ summary: 'Comment qo\'shish' })
  create(
    @CurrentUser('id') userId: string,
    @Param('habitId') habitId: string,
    @Body() dto: CreateCommentDto,
  ) {
    return this.commentsService.create(userId, habitId, dto);
  }

  // GET /habits/:habitId/comments
  @Get('habits/:habitId/comments')
  @ApiOperation({ summary: 'Habit commentlari' })
  findAll(
    @CurrentUser('id') userId: string,
    @Param('habitId') habitId: string,
    @Query() query: CommentQueryDto,
  ) {
    return this.commentsService.findAll(userId, habitId, query);
  }

  // PATCH /comments/:id
  @Patch('comments/:id')
  @ApiOperation({ summary: 'Commentni tahrirlash' })
  update(
    @CurrentUser('id') userId: string,
    @Param('id') commentId: string,
    @Body() dto: UpdateCommentDto,
  ) {
    return this.commentsService.update(userId, commentId, dto);
  }

  // DELETE /comments/:id
  @Delete('comments/:id')
  @ApiOperation({ summary: 'Commentni o\'chirish' })
  remove(
    @CurrentUser('id') userId: string,
    @Param('id') commentId: string,
  ) {
    return this.commentsService.remove(userId, commentId);
  }
}