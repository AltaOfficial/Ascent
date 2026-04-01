import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
} from 'typeorm';

@Entity({ name: 'time_entries' })
export class TimeEntryEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  taskId: string;

  @Column()
  userId: string;

  @CreateDateColumn()
  startedAt: Date;

  @Column({ nullable: true, type: 'timestamp' })
  endedAt: Date;
}
