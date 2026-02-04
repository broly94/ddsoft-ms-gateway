import { NestFactory } from '@nestjs/core';
import { AppModule } from '@/app.module';
import { RpcExceptionFilter } from '@/common/filters/rpc-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bodyParser: true,
    rawBody: true,
  });

  // Aumentar el límite de tamaño del body para archivos grandes (50MB)
  app.use(require('body-parser').json({ limit: '50mb' }));
  app.use(require('body-parser').urlencoded({ limit: '50mb', extended: true }));

  app.enableCors({
    origin: '*', // Para pruebas con Postman
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    credentials: false,
  });

  app.setGlobalPrefix('api/v1');

  app.useGlobalFilters(new RpcExceptionFilter());

  await app.listen(3000, '0.0.0.0');

  console.log(`API Gateway está corriendo: 0.0.0.0:3000/api/v1...`);
}
bootstrap();
