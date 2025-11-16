import { Module, MiddlewareConsumer, NestModule, RequestMethod } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { AppController } from './app.controller'
import { AppService } from './app.service'
import { PrismaModule } from './prisma/prisma.module'
import { CommonModule } from './common/common.module'
import { AuthModule } from './auth/auth.module'
import { WorkflowsModule } from './workflows/workflows.module'
import { ExecutionsModule } from './executions/executions.module'
import { TenantsModule } from './tenants/tenants.module'
import { TenantMiddleware } from './common/middleware/tenant.middleware'
import configuration from './config/configuration'

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      envFilePath: ['.env.local', '.env'],
    }),
    PrismaModule,
    CommonModule,
    AuthModule,
    WorkflowsModule,
    ExecutionsModule,
    TenantsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(TenantMiddleware)
      .exclude(
        { path: 'auth/register', method: RequestMethod.POST },
        { path: 'auth/login', method: RequestMethod.POST },
        { path: 'auth/refresh', method: RequestMethod.POST },
        { path: 'health', method: RequestMethod.GET }
      )
      .forRoutes('*')
  }
}
