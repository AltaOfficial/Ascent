import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

// Folders group projects on the Projects page and can nest to any depth.
@Entity({ name: 'project_folders' })
export class ProjectFolderEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column()
  userId: string;

  // null = top level
  @Column({ type: 'varchar', nullable: true })
  parentId: string | null;

  @Column({ default: 0 })
  position: number;

  @Column({ default: false })
  collapsed: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
