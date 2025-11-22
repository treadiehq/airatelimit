import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Project } from '../projects/projects.entity';

@Entity('rule_triggers')
@Index(['projectId', 'triggeredAt'])
@Index(['projectId', 'ruleId', 'triggeredAt'])
export class RuleTrigger {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  projectId: string;

  @ManyToOne(() => Project, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'projectId' })
  project: Project;

  @Column()
  ruleId: string; // The ID of the rule that was triggered

  @Column()
  ruleName: string; // Snapshot of rule name at time of trigger

  @Column()
  identity: string; // User/session/device identity

  @Column({ nullable: true })
  tier?: string; // User tier if provided

  @Column({ type: 'jsonb' })
  condition: any; // Snapshot of the condition that matched

  @Column({ type: 'jsonb' })
  action: any; // Snapshot of the action taken

  @Column({ type: 'jsonb', nullable: true })
  context?: any; // Additional context (usage at time of trigger)

  @CreateDateColumn()
  triggeredAt: Date;
}

