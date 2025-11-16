import { Test, TestingModule } from '@nestjs/testing'
import { ConfigModule } from '@nestjs/config'
import { AppController } from './app.controller'
import { AppService } from './app.service'
import configuration from './config/configuration'

describe('AppController', () => {
  let appController: AppController
  let appService: AppService

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          load: [configuration],
        }),
      ],
      controllers: [AppController],
      providers: [AppService],
    }).compile()

    appController = app.get<AppController>(AppController)
    appService = app.get<AppService>(AppService)
  })

  describe('getHealth', () => {
    it('should return health status', () => {
      const result = appController.getHealth()
      expect(result).toHaveProperty('status', 'ok')
      expect(result).toHaveProperty('message')
      expect(result).toHaveProperty('timestamp')
    })
  })

  describe('getDetailedHealth', () => {
    it('should return detailed health information', () => {
      const result = appController.getDetailedHealth()
      expect(result).toHaveProperty('status', 'ok')
      expect(result).toHaveProperty('service', 'bff')
      expect(result).toHaveProperty('version')
      expect(result).toHaveProperty('environment')
      expect(result).toHaveProperty('uptime')
    })
  })
})
