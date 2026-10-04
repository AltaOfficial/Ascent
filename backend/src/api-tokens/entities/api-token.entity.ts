import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

// Personal access tokens for non-browser clients (the Ascent MCP server).
// Only a SHA-256 hash is stored; the plaintext is shown once on creation.

@Entity({ name: 'api_tokens' })
export class ApiTokenEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column()
  name: string;

  @Index({ unique: true })
  @Column()
  tokenHash: string;

  // First characters of the token, so the user can tell tokens apart
  @Column()
  preview: string;

  @Column({ type: 'timestamp', nullable: true })
  lastUsedAt: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  revokedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;
}
