import { Controller, Get } from '@nestjs/common';

@Controller('price-comparator')
export class PriceComparatorController {
  @Get()
  getComparatorStatus() {
    return { status: 'Price Comparator is running' };
  }
}