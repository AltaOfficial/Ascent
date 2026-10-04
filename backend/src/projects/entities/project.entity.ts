import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
} from 'typeorm';

export enum ProjectViewType {
  KANBAN = 'kanban',
  LIST = 'list',
}

@Entity({ name: 'projects' })
export class ProjectEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({
    type: 'enum',
    enum: ProjectViewType,
    default: ProjectViewType.LIST,
  })
  viewType: ProjectViewType;

  @Column({ nullable: true })
  color: string;

  // null = top level (not in any folder)
  @Column({ type: 'varchar', nullable: true })
  folderId: string | null;

  // Sort order within the folder (or the top level)
  @Column({ default: 0 })
  position: number;

  @Column()
  userId: string;

  @CreateDateColumn()
  createdAt: Date;
}
