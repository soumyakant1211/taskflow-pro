import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthUser, CurrentUser } from '../common/auth.decorators.js';
import { CommentsService } from '../comments/comments.service.js';
import { CreateCommentDto, CreateTaskDto, ListTasksQueryDto, UpdateTaskStatusDto, UpdateTaskDto } from './tasks.dto.js';
import { TasksService } from './tasks.service.js';

@ApiTags('Tasks')
@ApiBearerAuth()
@Controller('tasks')
export class TasksController {
  constructor(private readonly tasks: TasksService, private readonly comments: CommentsService) {}

  @Get()
  @ApiOperation({ summary: 'List tasks with filters, search, sorting and pagination' })
  list(@CurrentUser() user: AuthUser, @Query() q: ListTasksQueryDto) {
    return this.tasks.list(user, q);
  }

  @Post()
  @ApiOperation({ summary: 'Create a task in a project you belong to' })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateTaskDto) {
    return this.tasks.create(user, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Task details' })
  get(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.tasks.findOne(user, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update task fields' })
  update(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateTaskDto) {
    return this.tasks.update(user, id, dto);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Move task to another status (Kanban drag & drop)' })
  status(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateTaskStatusDto) {
    return this.tasks.updateStatus(user, id, dto.status);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete task (reporter / project owner / admin)' })
  remove(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.tasks.remove(user, id);
  }

  @Get(':id/comments')
  @ApiOperation({ summary: 'List comments on a task' })
  listComments(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.comments.list(user, id);
  }

  @Post(':id/comments')
  @ApiOperation({ summary: 'Add a comment to a task' })
  addComment(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: CreateCommentDto) {
    return this.comments.create(user, id, dto.body);
  }
}
