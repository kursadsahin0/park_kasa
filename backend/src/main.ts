import 'reflect-metadata'
import { NestFactory } from '@nestjs/core'
import { ValidationPipe } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import helmet from 'helmet'
import { AppModule } from './app.module'
import { setupSwagger } from './http/swagger'

function assertNoFrontendSecrets() {
  const leaked = Object.keys(process.env).filter(
    (key) =>
      key.startsWith('VITE_') &&
      /SERVICE_ROLE|DATABASE_URL|JWT_SECRET|LICENSE_SECRET|DIRECT_URL/.test(key),
  )
  if (leaked.length) {
    throw new Error(`Gizli değişken tarayıcı önekiyle yüklendi: ${leaked.join(', ')}`)
  }
}

async function bootstrap() {
  assertNoFrontendSecrets()
  const app = await NestFactory.create(AppModule)
  const config = app.get(ConfigService)

  app.setGlobalPrefix('api')
  app.use(helmet())
  app.enableCors({
    origin: config.get<string>('CORS_ORIGIN')?.split(',') ?? [
      'http://localhost:9000',
      'http://localhost:9001',
    ],
    credentials: true,
  })
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  )

  setupSwagger(app)

  const port = config.get<number>('PORT') ?? 3000
  await app.listen(port)
}

void bootstrap()
