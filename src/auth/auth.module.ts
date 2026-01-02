import { ClientsConfigModule } from '@/common/clients-config.module';
import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';

@Module({
  imports: [ClientsConfigModule],
  controllers: [AuthController],
  providers: [],
})
export class AuthModule {}
