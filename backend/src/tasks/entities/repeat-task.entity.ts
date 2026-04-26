import {
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Entity,
  Timestamp,
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

export enum RepeatFrequency {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  CUSTOM = 'custom',
}

@Entity({ name: 'repeat_tasks' })
export class RepeatTaskEntity {
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

  // edge case: if section is deleted, and task tries to be repeated, it will error out
  @Column({ nullable: true })
  sectionId: string;

  @Column()
  userId: string;

  @Column({ nullable: true })
  categoryTag: string;

  @Column({
    nullable: true,
    type: 'enum',
    enum: RepeatFrequency,
  })
  repeatFrequency: RepeatFrequency;

  @Column({ nullable: true, type: 'int', array: true })
  repeatDays: number[];

  @Column({ nullable: true })
  repeatInterval: number;

  @Column({ nullable: true, type: 'timestamp' })
  nextOccurrence: Date;

  @Column({ nullable: true })
  estimatedMinutes: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
