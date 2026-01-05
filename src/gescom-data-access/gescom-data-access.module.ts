import { Module } from '@nestjs/common';
import { GescomController } from './gescom-data-access.controller';
import { ClientsConfigModule } from '@/common/clients-config.module';
import { ClientsModule, Transport } from '@nestjs/microservices';

@Module({
  imports: [
    ClientsConfigModule,
    ClientsModule.register([
      {
        name: 'GESCOM_SERVICE',
        transport: Transport.REDIS,
        options: {
          host: process.env.REDIS_HOST || 'localhost',
          port: parseInt(process.env.REDIS_PORT as string, 10) || 6379,
        },
      },
    ]),
  ],
  controllers: [GescomController],
})
export class GescomDataAccessModule {}
