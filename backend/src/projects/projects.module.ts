import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProjectEntity } from './entities/project.entity';
import { ProjectSectionEntity } from './entities/project-section.entity';
import { ProjectsService } from './projects.service';
import { ProjectsController } from './projects.controller';
import { TaskTagEntity } from './entities/task-tag.entity';
import { ProjectFolderEntity } from './entities/project-folder.entity';
import { ProjectFoldersController } from './project-folders.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ProjectEntity,
      ProjectSectionEntity,
      TaskTagEntity,
      ProjectFolderEntity,
    ]),
  ],
  controllers: [ProjectsController, ProjectFoldersController],
  providers: [ProjectsService],
  exports: [ProjectsService],
})
export class ProjectsModule {}
