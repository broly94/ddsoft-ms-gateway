import { RpcExceptionInterceptor } from '@/common/interceptors/rpc-exception.interceptor';
import {
  Body,
  Controller,
  Get,
  Inject,
  Post,
  Put,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { firstValueFrom } from 'rxjs';
import { ClientProxy } from '@nestjs/microservices';
import { RegisterDto } from '@/auth/dto/register.dto';
import { UpdateUserDto } from '@/auth/dto/update.dto';
import { AuthGuard } from '@/auth/guards/auth.guard';
import { RolesGuard } from '@/auth/guards/roles.guard';
import { Roles } from '@/auth/decorators/roles.decorator';
import { UserRole } from '@/common/users/roles';

@UseInterceptors(RpcExceptionInterceptor)
@Controller('auth')
export class AuthController {
  constructor(@Inject('AUTH_SERVICE') private readonly client: ClientProxy) {}

  // @UseGuards(RolesGuard)
  // @Roles(UserRole.SUPERVISOR, UserRole.ADMIN)
  @Post('register')
  async register(@Body() body: RegisterDto) {
    return await firstValueFrom(this.client.send({ cmd: 'register' }, body));
  }

  @Put('update')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.SUPERVISOR, UserRole.ADMIN)
  async update(@Body() body: UpdateUserDto, @Query('id') id: number) {
    return await firstValueFrom(
      this.client.send({ cmd: 'update' }, { id: Number(id), ...body }),
    );
  }

  @Post('login')
  async login(@Body() body: any) {
    console.log(body);
    return await firstValueFrom(this.client.send({ cmd: 'login' }, body));
  }

  @Get('get-user')
  @Roles(UserRole.SUPERVISOR, UserRole.ADMIN)
  async getUser(@Query('id') id: string) {
    return await firstValueFrom(
      this.client.send({ cmd: 'get-user' }, Number(id)),
    );
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.SUPERVISOR, UserRole.ADMIN)
  @Get('get-users')
  async getUsers() {
    return await firstValueFrom(this.client.send({ cmd: 'get-users' }, {}));
  }

  @Put('soft-delete')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.SUPERVISOR, UserRole.ADMIN)
  async softDelete(@Query('id') id: number) {
    return await firstValueFrom(
      this.client.send({ cmd: 'soft-delete' }, Number(id)),
    );
  }
}
