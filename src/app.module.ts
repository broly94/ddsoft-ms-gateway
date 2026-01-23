import { Module } from '@nestjs/common';
import { PriceComparatorModule } from '@/price-comparator/price-comparator.module';
import { CronModule } from '@/cron/cron.module';
import { AuthModule } from '@/auth/auth.module';
import { GescomDataAccessModule } from './gescom-data-access/gescom-data-access.module';
import { HttpModule } from '@nestjs/axios';
import { SalesModule } from './sales/sales.module';
import { PurchasesModule } from './purchases/purchases.module';

@Module({
  imports: [
    HttpModule.register({
      timeout: 30000,
      maxRedirects: 5,
    }),
    CronModule,
    AuthModule,
    GescomDataAccessModule,
    PriceComparatorModule,
    SalesModule,
    PurchasesModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
