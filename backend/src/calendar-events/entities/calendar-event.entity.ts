import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'calendar_events' })
export class CalendarEventEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column()
  type: string;

  @Column()
  title: string;

  @Column()
  date: string;

  @Column({ nullable: true })
  time: string;

  @Column({ nullable: true, type: 'text' })
  notes: string;

  @Column({ default: false })
  done: boolean;

  @Column({ nullable: true })
  project: string;

  @Column({ nullable: true })
  priority: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
