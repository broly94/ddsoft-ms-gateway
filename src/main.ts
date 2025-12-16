import { NestFactory } from '@nestjs/core';
import { AppModule } from '@/app.module';
import { RpcExceptionFilter } from '@/common/filters/rpc-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api/v1');

  app.useGlobalFilters(new RpcExceptionFilter());

  await app.listen(3000);

  console.log(`API Gateway está corriendo: localhost:3000/api/v1`);
}
bootstrap();
