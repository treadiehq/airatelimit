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
        const nodeEnv = configService.get<string>('nodeEnv');
        const isProduction = nodeEnv === 'production';

        return {
          type: 'postgres',
          host: url.hostname,
          port: parseInt(url.port, 10) || 5432,
          username: url.username,
          password: url.password,
          database: url.pathname.slice(1),
          entities: [__dirname + '/../**/*.entity{.ts,.js}'],
          
          // Only auto-sync schema in development; production uses manual migrations
          synchronize: !isProduction,

          // ====================================
          // CONNECTION POOL & QUERY SETTINGS (pg driver via extra)
          // ====================================
          extra: {
            max: isProduction ? 20 : 5,
            connectionTimeoutMillis: 10000,
            idleTimeoutMillis: 30000,
            statement_timeout: 30000,
            idle_in_transaction_session_timeout: 60000,
          },
          
          // ====================================
          // LOGGING
          // ====================================
          // Only log errors and schema changes, not every query
          logging: isProduction 
            ? ['error'] 
            : ['error', 'warn', 'schema'],
          
          // Log slow queries in production (> 1 second)
          maxQueryExecutionTime: isProduction ? 1000 : undefined,
          
          // ====================================
          // SSL (for production)
          // ====================================
          ssl: isProduction ? { rejectUnauthorized: false } : false,
        };
      },
    }),
  ],
})
export class DatabaseModule {}
