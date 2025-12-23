import { Module } from '@nestjs/common';
import { GescomController } from './gescom-data-access.controller';
import { ClientsConfigModule } from '@/common/clients-config.module';

@Module({
  imports: [ClientsConfigModule],
  controllers: [GescomController],
})
export class GescomDataAccessModule {}
