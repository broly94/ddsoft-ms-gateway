import { ClientsConfigModule } from '@/common/clients-config.module';
import { Module } from '@nestjs/common';

@Module({
  imports: [ClientsConfigModule],
  controllers: [],
  providers: [],
})
export class AuthModule {}
