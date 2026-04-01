import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('compliance_entries')
export class ComplianceEntryEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column()
  ruleId: string;

  // ISO date string: YYYY-MM-DD
  @Column({ type: 'date' })
  date: string;

  @Column({ default: false })
  checked: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
