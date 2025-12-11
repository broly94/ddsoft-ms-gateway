import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Injectable()
export class RpcExceptionInterceptor implements NestInterceptor {
  private readonly logger = new Logger(RpcExceptionInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      catchError((error: any) => {
        this.logger.error('Error crudo del microservicio:', error);

        // --- Lógica de Extracción Mejorada ---

        let rpcError = error;

        // A veces el error del microservicio viene envuelto en una propiedad 'error'
        if (error && typeof error === 'object' && error.error) {
          rpcError = error.error;
        }
        // Otras veces, viene directamente en la raíz si es un RpcException plano
        else if (error && error.statusCode && error.message) {
          rpcError = error;
        }

        // Si rpcError es una cadena (a veces pasa), lo manejamos
        if (typeof rpcError === 'string') {
          return throwError(
            () => new HttpException(rpcError, HttpStatus.INTERNAL_SERVER_ERROR),
          );
        }

        const status = rpcError?.statusCode || HttpStatus.INTERNAL_SERVER_ERROR;
        const message = rpcError?.message || 'Error interno del servidor';
        const details = rpcError?.details || null; // Tus mensajes de validación detallados

        this.logger.debug(
          `Mapeando a HTTP Status: ${status}, Message: ${message}`,
        );

        // Lanzar como HttpException usando el status NUMÉRICO
        return throwError(
          () =>
            new HttpException(
              {
                statusCode: status,
                message: message,
                errors: details, // Esto contendrá tus mensajes de validación
              },
              status,
            ),
        );
      }),
    );
  }
}
