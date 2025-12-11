import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { Request } from 'express';
import { firstValueFrom } from 'rxjs';
import { UserRole } from '@/common/users/roles';

/**
 * Interfaz para el payload del usuario que esperamos recibir del servicio de autenticación.
 * Define la estructura de datos del usuario decodificada desde el token.
 */
export interface UserPayload {
  id: number;
  email: string;
  role: UserRole;
  iat?: number; // Issued at (timestamp)
  exp?: number; // Expiration time (timestamp)
}

/**
 * Extendemos el tipo `Request` de Express para incluir nuestra propiedad `user`.
 * Esto nos da autocompletado y seguridad de tipos al acceder a `request.user`.
 */
declare module 'express' {
  export interface Request {
    user?: UserPayload;
  }
}

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    @Inject('AUTH_SERVICE') private readonly authServiceClient: ClientProxy,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException('No se proporcionó un token de autenticación.');
    }

    try {
      // Enviamos el token al microservicio 'auth' para su validación.
      // El patrón 'verify_token' debe ser manejado por el microservicio 'auth'.
      const userPayload: UserPayload = await firstValueFrom(
        this.authServiceClient.send({ cmd: 'verify_token' }, { token }),
      );
      
      if (!userPayload) {
        // Aunque el servicio no devuelva error, si no hay payload, el token es inválido.
        throw new UnauthorizedException('Token inválido.');
      }

      // Adjuntamos el payload del usuario al objeto `request` para su uso posterior
      // en otros guards (como RolesGuard) o en el propio controlador.
      request.user = userPayload;

    } catch (error) {
      // `firstValueFrom` convierte el error del microservicio (RpcException) en una excepción de JavaScript.
      // Lanzamos un error de no autorizado genérico para no exponer detalles internos.
      throw new UnauthorizedException('Token no válido o expirado.');
    }

    return true; // Si todo va bien, permite el acceso.
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
