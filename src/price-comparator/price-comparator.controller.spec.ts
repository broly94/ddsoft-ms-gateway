import { Test, TestingModule } from '@nestjs/testing';
import { PriceComparatorController } from './price-comparator.controller';

describe('PriceComparatorController', () => {
  let controller: PriceComparatorController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PriceComparatorController],
    }).compile();

    controller = module.get<PriceComparatorController>(PriceComparatorController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
