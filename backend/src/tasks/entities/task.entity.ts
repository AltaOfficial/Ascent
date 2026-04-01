import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

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

  @Column({ type: 'enum', enum: TaskPriority, nullable: true })
  priority: TaskPriority;

  @Column({ nullable: true })
  projectId: string;

  @Column()
  userId: string;

  @Column({ nullable: true })
  categoryTag: string;

  @Column({ nullable: true, type: 'timestamp' })
  dueDate: Date;

  @Column({ nullable: true })
  estimatedMinutes: number;

  @Column({ default: false })
  isHighValue: boolean;

  @Column({ default: false })
  isRevenueImpact: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
