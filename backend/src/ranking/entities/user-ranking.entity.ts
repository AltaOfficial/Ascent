import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

// One row per user per scored day — the rank as it stood after that day.
@Entity({ name: 'user_rankings' })
@Index(['userId', 'date'], { unique: true })
export class UserRankingEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  // ISO date string: YYYY-MM-DD (user's timezone)
  @Column({ type: 'date' })
  date: string;

  @Column({ type: 'double precision' })
  score: number;

  @Column()
  rank: string;

  @Column({ type: 'date', nullable: true })
  cycleStart: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
