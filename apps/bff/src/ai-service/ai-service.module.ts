import { Module } from '@nestjs/common'
import { HttpModule } from '@nestjs/axios'
import { ConfigModule } from '@nestjs/config'
import { AiServiceClient } from './ai-service.client'

@Module({
  imports: [
    HttpModule.register({
      timeout: 300000, // 5 minutes default timeout
      maxRedirects: 5,
    }),
    ConfigModule,
  ],
  providers: [AiServiceClient],
  exports: [AiServiceClient],
})
export class AiServiceModule {}
