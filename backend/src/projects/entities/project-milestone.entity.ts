import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

export enum MilestoneStatus {
  OPEN = 'open',
  DONE = 'done',
}

@Entity({ name: 'project_milestones' })
export class ProjectMilestoneEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  // ISO date string: YYYY-MM-DD
  @Column({ type: 'date', nullable: true })
  targetDate: string | null;

  @Column({
    type: 'enum',
    enum: MilestoneStatus,
    default: MilestoneStatus.OPEN,
  })
  status: MilestoneStatus;

  @Column({ default: 0 })
  position: number;

  @Column()
  projectId: string;

  @Column()
  userId: string;

  @Column({ type: 'timestamp', nullable: true })
  completedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;
}
