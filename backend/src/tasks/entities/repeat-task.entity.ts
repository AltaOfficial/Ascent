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

export enum RepeatMode {
  // One open copy at a time; a missed one gets its due date moved forward
  CARRY_OVER = 'carry_over',
  // A new copy every occurrence, even if earlier ones are still open
  PILE_UP = 'pile_up',
  // The next copy is created when the current one is completed
  AFTER_COMPLETION = 'after_completion',
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

  // If the section (or project) is gone by the time a copy is created, the copy
  // falls back to the project's unsectioned list (or the inbox).
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

  @Column({ type: 'enum', enum: RepeatMode, default: RepeatMode.CARRY_OVER })
  repeatMode: RepeatMode;

  @Column({ nullable: true, type: 'timestamp' })
  nextOccurrence: Date | null;

  @Column({ nullable: true })
  estimatedMinutes: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
