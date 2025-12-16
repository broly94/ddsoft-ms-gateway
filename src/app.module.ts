import { Module } from '@nestjs/common';
import { PriceComparatorModule } from './price-comparator/price-comparator.module';

@Module({
  imports: [
    // Otros módulos que puedas tener
    PriceComparatorModule,
  ],
  controllers: [],
  providers: [
    // Proveedores globales si los hubiera
  ],
})
export class AppModule {}
