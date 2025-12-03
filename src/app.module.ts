import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { AuthController } from '@/auth/auth.controller';
import { PriceComparatorController } from '@/price-comparator/price-comparator.controller';
import { SalesController } from '@/sales/sales.controller';
import { AuthModule } from '@/auth/auth.module';
import { ClientsConfigModule } from './common/clients-config.module';

@Module({
  imports: [ClientsConfigModule, AuthModule],
  controllers: [AuthController, PriceComparatorController, SalesController],
  providers: [],
})
export class AppModule {}
