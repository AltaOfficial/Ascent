import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('urge_logs')
export class UrgeLogEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column()
  ruleId: string;

  @CreateDateColumn()
  occurredAt: Date;

  @Column({ type: 'int', default: 5 })
  intensity: number;

  @Column({ type: 'int', nullable: true })
  durationSeconds: number | null;

  @Column({ type: 'varchar', length: 200, default: '' })
  trigger: string;

  @Column({ type: 'varchar', length: 200, nullable: true })
  whoWhere: string | null;

  @Column({ type: 'varchar', length: 200, nullable: true })
  copingNotes: string | null;

  @Column({ type: 'varchar', length: 200, nullable: true })
  nextTimeIdea: string | null;

  @Column({ type: 'varchar', length: 200, nullable: true })
  reflection: string | null;
}
