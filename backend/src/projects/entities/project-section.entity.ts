import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
} from 'typeorm';

@Entity({ name: 'project_sections' })
export class ProjectSectionEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ default: 0 })
  order: number;

  @Column()
  projectId: string;

  @Column()
  userId: string;

  @CreateDateColumn()
  createdAt: Date;
}
