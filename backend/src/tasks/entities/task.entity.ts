import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { RepeatTaskEntity } from './repeat-task.entity';

export enum TaskStatus {
  TODO = 'todo',
  IN_PROGRESS = 'in_progress',
  BLOCKED = 'blocked',
  DONE = 'done',
}

export enum TaskPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
}

@Entity({ name: 'tasks' })
export class TaskEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({ nullable: true, type: 'text' })
  description: string;

  @Column({ type: 'enum', enum: TaskStatus, default: TaskStatus.TODO })
  status: TaskStatus;

  @Column({ type: 'enum', enum: TaskPriority, default: TaskPriority.LOW })
  priority: TaskPriority;

  @Column({ nullable: true })
  projectId: string;

  @Column({ nullable: true })
  sectionId: string;

  @Column()
  userId: string;

  @Column({ nullable: true })
  categoryTag: string;

  @ManyToOne(() => RepeatTaskEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'repeatTaskId' })
  repeatTask: RepeatTaskEntity | null;

  @Column({ nullable: true, type: 'timestamp' })
  dueDate: Date;

  @Column({ nullable: true })
  estimatedMinutes: number;

  // Sort order within the task's section (or the project's unsectioned list)
  @Column({ default: 0 })
  position: number;

  @Column({ type: 'varchar', nullable: true })
  milestoneId: string | null;

  @Column({ nullable: true, type: 'timestamp' })
  completedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
