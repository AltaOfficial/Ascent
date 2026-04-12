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

  @Column()
  userId: string;

  @CreateDateColumn()
  createdAt: Date;
}
