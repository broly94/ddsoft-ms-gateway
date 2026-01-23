import { Controller, Get, Inject, Query } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Controller('purchases')
export class PurchasesController {
  constructor(
    @Inject('PURCHASES_SERVICE') private client: ClientProxy,
    private readonly httpService: HttpService,
  ) {}

  @Get('ping-redis')
  async pingRedis(@Query('msg') msg: string) {
    return this.client.send('purchases.ping', msg || 'ping');
  }

  @Get('ping-http')
  async pingHttp() {
    // In docker, 'purchases' is the service name
    const url = `http://purchases:3000`;
    try {
      const response = await firstValueFrom(this.httpService.get(url));
      return response.data;
    } catch (error) {
      return { error: 'Could not connect to purchases service via HTTP', details: error.message };
    }
  }
}
