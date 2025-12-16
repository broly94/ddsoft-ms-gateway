import { Module } from '@nestjs/common';
import { AuthController } from '@/auth/auth.controller';
import { PriceComparatorController } from '@/price-comparator/price-comparator.controller';
import { SalesController } from '@/sales/sales.controller';
import { ClientsConfigModule } from './common/clients-config.module';
import { AuthModule } from '@/auth/auth.module';
import { GescomModule } from '@/gescom-data-access/gescom-data-access.module';
import { EtlController } from '@/price-comparator/etl.controller';

@Module({
  imports: [ClientsConfigModule, AuthModule, GescomModule],
  controllers: [
    AuthController,
    PriceComparatorController,
    SalesController,
    EtlController,
  ],
  providers: [],
})
export class AppModule {}
