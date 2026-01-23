import { Module } from '@nestjs/common';
import { PurchasesController } from './purchases.controller';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { ClientsConfigModule } from '@/common/clients-config.module';

@Module({
  imports: [
    HttpModule.register({
      timeout: 10000,
      maxRedirects: 5,
    }),
    ConfigModule,
    ClientsConfigModule,
  ],
  controllers: [PurchasesController],
})
export class PurchasesModule {}
