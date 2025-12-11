import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { UserRole } from '@/common/users/roles';
import { UserPayload } from './auth.guard';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Obtener los roles requeridos para la ruta desde la metadata del decorador @Roles.
    // getAllAndOverride permite que el decorador a nivel de método sobreescriba al de la clase.
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    // Si no se definieron roles en el decorador, la ruta es pública en términos de roles.
    // AuthGuard ya debería haber protegido la ruta si se requería autenticación.
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    // Obtener el objeto `user` del `request`, que fue adjuntado por el `AuthGuard`.
    const request = context.switchToHttp().getRequest();
    const user: UserPayload = request.user;

    // Si por alguna razón no hay usuario o no tiene un rol, denegar el acceso.
    if (!user || !user.role) {
      throw new ForbiddenException('No se pudo determinar el rol del usuario.');
    }

    // Comprobar si el rol del usuario está incluido en la lista de roles requeridos.
    const hasPermission = requiredRoles.some((role) => user.role === role);

    if (!hasPermission) {
      throw new ForbiddenException('No tienes los permisos necesarios para acceder a este recurso.');
    }

    return true;
  }
}
