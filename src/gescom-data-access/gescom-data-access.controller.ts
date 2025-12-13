import { Controller, Get, Inject } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';

@Controller('gescom-data-access')
export class GescomController {
  constructor(@Inject('GESCOM_SERVICE') private readonly client: ClientProxy) {}

  @Get('health')
  healthCheck() {
    return this.client.send('health-check', {});
  }
}
