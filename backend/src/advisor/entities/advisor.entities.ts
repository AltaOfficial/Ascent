import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryColumn,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'advisor_threads' })
export class AdvisorThreadEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column()
  name: string;

  @Column({ default: 0 })
  position: number;

  @Column({ default: false })
  pinned: boolean;

  // Drives "recent first" ordering in the chat list
  @Column({ type: 'timestamp', nullable: true })
  lastMessageAt: Date | null;

  // AI-suggested next questions, refreshed after each reply
  @Column({ type: 'jsonb', nullable: true })
  suggestions: string[] | null;

  @CreateDateColumn()
  createdAt: Date;
}

export enum AdvisorRole {
  USER = 'user',
  ASSISTANT = 'assistant',
}

@Entity({ name: 'advisor_messages' })
@Index(['threadId', 'createdAt'])
export class AdvisorMessageEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  threadId: string;

  @Column()
  userId: string;

  @Column({ type: 'enum', enum: AdvisorRole })
  role: AdvisorRole;

  @Column({ type: 'text' })
  content: string;

  @CreateDateColumn()
  createdAt: Date;
}

// Persistent context the advisor carries across all threads. One row per user.
@Entity({ name: 'advisor_memory' })
export class AdvisorMemoryEntity {
  @PrimaryColumn()
  userId: string;

  @Column({ default: '' })
  stage: string;

  @Column({ type: 'text', default: '' })
  priority: string;

  @Column({ type: 'text', default: '' })
  projects: string;

  @Column({ type: 'text', default: '' })
  bottleneck: string;

  @Column({ type: 'text', default: '' })
  constraints: string;

  @UpdateDateColumn()
  updatedAt: Date;
}
