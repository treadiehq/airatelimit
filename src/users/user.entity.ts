import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  ManyToOne,
  Index,
} from 'typeorm';
import { Project } from '../projects/projects.entity';
import { Organization } from '../organizations/organization.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  @Index()
  email: string;

  @Column({ nullable: true })
  passwordHash: string;

  @Column({ nullable: true })
  magicLinkToken: string;

  @Column({ nullable: true })
  magicLinkExpiresAt: Date;

  @Column()
  @Index()
  organizationId: string;

  @ManyToOne(() => Organization, (organization) => organization.users)
  organization: Organization;

  @OneToMany(() => Project, (project) => project.owner)
  projects: Project[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

