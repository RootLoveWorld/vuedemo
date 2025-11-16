import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'

@Injectable()
export class AppService {
  constructor(private configService: ConfigService) {}

  getHealth() {
    return {
      status: 'ok',
      message: 'AI Workflow Platform BFF is running',
      timestamp: new Date().toISOString(),
    }
  }

  getDetailedHealth() {
    return {
      status: 'ok',
      service: 'bff',
      version: '1.0.0',
      environment: this.configService.get('NODE_ENV', 'development'),
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    }
  }
}
