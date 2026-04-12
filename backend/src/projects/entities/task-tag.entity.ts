import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
} from 'typeorm';

@Entity({ name: 'task_tags' })
export class TaskTagEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ default: '#6b7280' })
  color: string;

  @Column()
  projectId: string;

  @Column()
  userId: string;

  @CreateDateColumn()
  createdAt: Date;
}
