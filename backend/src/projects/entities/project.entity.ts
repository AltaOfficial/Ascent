import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
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
  categoryTag: string;

  @Column({ nullable: true })
  color: string;

  @Column()
  userId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
