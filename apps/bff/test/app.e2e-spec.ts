import { Test, TestingModule } from '@nestjs/testing'
import { INestApplication } from '@nestjs/common'
import * as request from 'supertest'
import { AppModule } from '../src/app.module'

describe('AppController (e2e)', () => {
  let app: INestApplication

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile()

    app = moduleFixture.createNestApplication()
    await app.init()
  })

  afterEach(async () => {
    await app.close()
  })

  it('/ (GET) - health check', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect((res) => {
        expect(res.body).toHaveProperty('status', 'ok')
        expect(res.body).toHaveProperty('message')
        expect(res.body).toHaveProperty('timestamp')
      })
  })

  it('/health (GET) - detailed health check', () => {
    return request(app.getHttpServer())
      .get('/health')
      .expect(200)
      .expect((res) => {
        expect(res.body).toHaveProperty('status', 'ok')
        expect(res.body).toHaveProperty('service', 'bff')
        expect(res.body).toHaveProperty('version')
        expect(res.body).toHaveProperty('environment')
        expect(res.body).toHaveProperty('uptime')
      })
  })
})
