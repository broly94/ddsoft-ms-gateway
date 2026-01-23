import { Module } from '@nestjs/common';
import { SalesController } from './sales.controller';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { ClientsConfigModule } from '@/common/clients-config.module';

@Module({
  imports: [
    HttpModule.register({
      timeout: 60000,
      maxRedirects: 5,
    }),
    ConfigModule,
    ClientsConfigModule,
  ],
  controllers: [SalesController],
})
export class SalesModule {}
