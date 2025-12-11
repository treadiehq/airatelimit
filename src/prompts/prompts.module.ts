import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Prompt } from './prompt.entity';
import { PromptsService } from './prompts.service';
import { PromptsController } from './prompts.controller';
import { ProjectsModule } from '../projects/projects.module';
import { ProjectAuthGuard } from '../common/guards/project-auth.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([Prompt]),
    forwardRef(() => ProjectsModule),
    ConfigModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret:
          configService.get<string>('jwtSecret') ||
          configService.get<string>('JWT_SECRET'),
      }),
    }),
  ],
  providers: [PromptsService, ProjectAuthGuard],
  controllers: [PromptsController],
  exports: [PromptsService],
})
export class PromptsModule {}

