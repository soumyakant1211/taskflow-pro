import { Module } from '@nestjs/common';
import { CommentsModule } from '../comments/comments.module.js';
import { ProjectsModule } from '../projects/projects.module.js';
import { TasksController } from './tasks.controller.js';
import { TasksService } from './tasks.service.js';

@Module({ imports: [ProjectsModule, CommentsModule], controllers: [TasksController], providers: [TasksService], exports: [TasksService] })
export class TasksModule {}
