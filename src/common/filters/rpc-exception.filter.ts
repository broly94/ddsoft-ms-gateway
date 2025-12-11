// src/common/filters/rpc-exception.filter.ts (En el API Gateway)

import {
  Catch,
  ArgumentsHost,
  ExceptionFilter,
  HttpStatus,
} from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { Response } from 'express';

@Catch(RpcException)
export class RpcExceptionFilter implements ExceptionFilter {
  catch(exception: RpcException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    // El objeto 'error' contiene la estructura que definiste en el microservicio
    // { statusCode: 400, message: '...', details: [...] }
    const error: any = exception.getError();

    // Verificamos si el error es un objeto con statusCode (nuestra estructura personalizada)
    if (
      typeof error === 'object' &&
      error !== null &&
      'statusCode' in error &&
      'message' in error
    ) {
      const status = error.statusCode;

      // Aseguramos que el status sea numérico antes de usarlo
      const httpStatus =
        typeof status === 'number' ? status : HttpStatus.INTERNAL_SERVER_ERROR;

      response.status(httpStatus).json({
        statusCode: httpStatus,
        message: error.message,
        errors: error.details || null,
        timestamp: new Date().toISOString(),
      });
    } else {
      // Manejo por defecto si el RpcException no sigue nuestra estructura
      response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Error interno del servidor no manejado por el filtro RPC.',
        timestamp: new Date().toISOString(),
      });
    }
  }
}
