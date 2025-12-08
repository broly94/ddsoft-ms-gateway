import { Body, Controller, Get, Inject, Post } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';

@Controller('auth')
export class AuthController {
  constructor(@Inject('AUTH_SERVICE') private readonly client: ClientProxy) {}

  @Post('register')
  async register(@Body() body: any) {
    try {
      const result = await firstValueFrom(
        this.client.send({ cmd: 'register' }, body),
      );
      return result;
    } catch (error) {
      console.error('Error in register:', error);
      throw error;
    }
  }

  @Post('login')
  async login(@Body() body: any) {
    try {
      const result = await firstValueFrom(
        this.client.send({ cmd: 'login' }, body),
      );
      return result;
    } catch (error) {
      console.error('Error in login:', error);
      throw error;
    }
  }
}
