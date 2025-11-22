/**
 * CLI script to manually seed reserved organization names
 * 
 * Usage: npm run seed:reserved-names
 */

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SeedReservedNamesService } from './organizations/seed-reserved-names.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['log', 'error', 'warn'],
  });

  const seedService = app.get(SeedReservedNamesService);

  console.log('🌱 Seeding reserved organization names...\n');

  await seedService.seed();

  console.log('\n✅ Seeding complete!');

  await app.close();
  process.exit(0);
}

bootstrap();

