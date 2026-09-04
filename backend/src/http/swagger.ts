import { INestApplication } from '@nestjs/common'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'

export function shouldExposeSwagger(env: NodeJS.Dict<string | undefined> = process.env) {
  if (env.SWAGGER_ENABLED === 'true') return true
  if (env.SWAGGER_ENABLED === 'false') return false
  return env.NODE_ENV !== 'production'
}

export function setupSwagger(app: INestApplication) {
  if (!shouldExposeSwagger()) return false
  const swagger = new DocumentBuilder()
    .setTitle('ParkKasa API')
    .setDescription('ParkKasa otopark işletim API')
    .setVersion('1.0.0')
    .addBearerAuth()
    .build()
  SwaggerModule.setup('api/docs', app, SwaggerModule.createDocument(app, swagger))
  return true
}
