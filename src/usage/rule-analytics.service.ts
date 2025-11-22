import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RuleTrigger } from './rule-trigger.entity';
import { Project } from '../projects/projects.entity';

export interface RuleTriggerLog {
  ruleId: string;
  ruleName: string;
  identity: string;
  tier?: string;
  condition: any;
  action: any;
  context?: any;
  triggeredAt: Date;
}

export interface RuleTriggerStats {
  ruleId: string;
  ruleName: string;
  triggerCount: number;
  lastTriggered: Date;
  uniqueIdentities: number;
}

@Injectable()
export class RuleAnalyticsService {
  constructor(
    @InjectRepository(RuleTrigger)
    private readonly ruleTriggerRepo: Repository<RuleTrigger>,
  ) {}

  /**
   * Log a rule trigger event
   */
  async logTrigger(params: {
    project: Project;
    ruleId: string;
    ruleName: string;
    identity: string;
    tier?: string;
    condition: any;
    action: any;
    context?: any;
  }): Promise<RuleTrigger> {
    const trigger = this.ruleTriggerRepo.create({
      projectId: params.project.id,
      ruleId: params.ruleId,
      ruleName: params.ruleName,
      identity: params.identity,
      tier: params.tier,
      condition: params.condition,
      action: params.action,
      context: params.context,
    });

    return this.ruleTriggerRepo.save(trigger);
  }

  /**
   * Get rule trigger statistics for a project
   */
  async getRuleStats(projectId: string, days: number = 7): Promise<RuleTriggerStats[]> {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const results = await this.ruleTriggerRepo
      .createQueryBuilder('trigger')
      .select('trigger.ruleId', 'ruleId')
      .addSelect('trigger.ruleName', 'ruleName')
      .addSelect('COUNT(*)', 'triggerCount')
      .addSelect('MAX(trigger.triggeredAt)', 'lastTriggered')
      .addSelect('COUNT(DISTINCT trigger.identity)', 'uniqueIdentities')
      .where('trigger.projectId = :projectId', { projectId })
      .andWhere('trigger.triggeredAt >= :since', { since })
      .groupBy('trigger.ruleId')
      .addGroupBy('trigger.ruleName')
      .orderBy('COUNT(*)', 'DESC')
      .getRawMany();

    return results.map((r) => ({
      ruleId: r.ruleId,
      ruleName: r.ruleName,
      triggerCount: parseInt(r.triggerCount, 10),
      lastTriggered: r.lastTriggered,
      uniqueIdentities: parseInt(r.uniqueIdentities, 10),
    }));
  }

  /**
   * Get recent rule triggers for a project
   */
  async getRecentTriggers(
    projectId: string,
    limit: number = 50,
  ): Promise<RuleTrigger[]> {
    return this.ruleTriggerRepo.find({
      where: { projectId },
      order: { triggeredAt: 'DESC' },
      take: limit,
    });
  }

  /**
   * Get triggers for a specific rule
   */
  async getTriggersForRule(
    projectId: string,
    ruleId: string,
    limit: number = 50,
  ): Promise<RuleTrigger[]> {
    return this.ruleTriggerRepo.find({
      where: { projectId, ruleId },
      order: { triggeredAt: 'DESC' },
      take: limit,
    });
  }

  /**
   * Get trigger count by day
   */
  async getTriggersByDay(projectId: string, days: number = 7) {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const results = await this.ruleTriggerRepo
      .createQueryBuilder('trigger')
      .select('DATE(trigger.triggeredAt)', 'date')
      .addSelect('COUNT(*)', 'count')
      .where('trigger.projectId = :projectId', { projectId })
      .andWhere('trigger.triggeredAt >= :since', { since })
      .groupBy('DATE(trigger.triggeredAt)')
      .orderBy('DATE(trigger.triggeredAt)', 'ASC')
      .getRawMany();

    return results.map((r) => ({
      date: r.date,
      count: parseInt(r.count, 10),
    }));
  }
}

