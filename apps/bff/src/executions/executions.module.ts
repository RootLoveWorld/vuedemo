import { Module } from '@nestjs/common'
import { JwtModule } from '@nestjs/jwt'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { ExecutionsService } from './executions.service'
import { ExecutionsController } from './executions.controller'
import { ExecutionsGateway } from './executions.gateway'
import { PrismaModule } from '../prisma/prisma.module'
import { AiServiceModule } from '../ai-service/ai-service.module'

@Module({
  imports: [
    PrismaModule,
    AiServiceModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('jwt.secret'),
        signOptions: {
          expiresIn: configService.get<string>('jwt.expiresIn'),
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [ExecutionsController],
  providers: [ExecutionsService, ExecutionsGateway],
  exports: [ExecutionsService, ExecutionsGateway],
})
export class ExecutionsModule {}
