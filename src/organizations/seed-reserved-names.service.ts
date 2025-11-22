import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ReservedOrganizationName } from './reserved-names.entity';
import { RESERVED_ORG_NAMES } from './reserved-names.constants';

@Injectable()
export class SeedReservedNamesService {
  private readonly logger = new Logger(SeedReservedNamesService.name);

  constructor(
    @InjectRepository(ReservedOrganizationName)
    private reservedNamesRepository: Repository<ReservedOrganizationName>,
  ) {}

  /**
   * Seed reserved names from constants file into database
   * Runs automatically on app startup
   */
  async seed(): Promise<void> {
    this.logger.log('Syncing reserved organization names...');
    
    let addedCount = 0;
    let skippedCount = 0;

    for (const reservedName of RESERVED_ORG_NAMES) {
      const nameLower = reservedName.name.toLowerCase();
      
      // Check if already exists
      const existing = await this.reservedNamesRepository.findOne({
        where: { name: nameLower },
      });

      if (!existing) {
        await this.reservedNamesRepository.save({
          name: nameLower,
          reason: reservedName.reason,
        });
        addedCount++;
      } else {
        skippedCount++;
      }
    }

    if (addedCount > 0) {
      this.logger.log(`✅ Added ${addedCount} new reserved names`);
    }
    if (skippedCount > 0) {
      this.logger.debug(`ℹ️  Skipped ${skippedCount} existing reserved names`);
    }
    
    this.logger.log(`📝 Total reserved names: ${RESERVED_ORG_NAMES.length}`);
  }

  /**
   * Clear all reserved names and re-seed from constants
   * Useful for cleaning up manually added names
   */
  async reseed(): Promise<void> {
    this.logger.log('Re-seeding reserved organization names...');
    
    // Clear all existing
    await this.reservedNamesRepository.clear();
    this.logger.log('🧹 Cleared all existing reserved names');
    
    // Re-seed from constants
    await this.seed();
    
    this.logger.log('✅ Re-seeding complete');
  }
}

