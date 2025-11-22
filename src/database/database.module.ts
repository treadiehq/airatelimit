import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const databaseUrl = configService.get<string>('database.url');
        if (!databaseUrl) {
          throw new Error('DATABASE_URL is not defined');
        }

        const url = new URL(databaseUrl);
        return {
          type: 'postgres',
          host: url.hostname,
          port: parseInt(url.port, 10) || 5432,
          username: url.username,
          password: url.password,
          database: url.pathname.slice(1),
          entities: [__dirname + '/../**/*.entity{.ts,.js}'],
          synchronize: configService.get<string>('nodeEnv') === 'development',
          // Only log errors and schema changes, not every query
          logging: configService.get<string>('nodeEnv') === 'development' ? ['error', 'warn', 'schema'] : false,
        };
      },
    }),
  ],
})
export class DatabaseModule {}

