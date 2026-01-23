import {
  Controller,
  Post,
  Get,
  Body,
  UploadedFiles,
  UseInterceptors,
  HttpException,
  HttpStatus,
  Res,
  Logger,
  Inject,
  Query,
  Param,
  Put,
  Delete,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { ClientProxy } from '@nestjs/microservices';
import type { Response } from 'express';
import FormData = require('form-data');

@Controller('sales')
export class SalesController {
  private readonly logger = new Logger(SalesController.name);
  private readonly salesServiceUrl = 'http://sales-service:8000';

  constructor(
    private readonly httpService: HttpService,
    @Inject('GESCOM_SERVICE') private readonly gescomClient: ClientProxy,
    @Inject('SALES_SERVICE') private readonly salesClient: ClientProxy,
  ) {}

  @Post('sync-gescom-data')
  async syncGescomData(@Query('query') query: string) {
    try {
      this.logger.log(`Fetching data from Gescom for query: ${query}`);
      
      // 1. Pedir datos a Gescom vía Redis
      const gescomData = await firstValueFrom(
        this.gescomClient.send({ cmd: 'get_data' }, { query })
      );

      this.logger.log(`Data received from Gescom, sending to Sales Service via Redis`);

      // 2. Enviar esos datos a Sales vía Redis
      const salesResponse = await firstValueFrom(
        this.salesClient.send('process_gescom_data', gescomData)
      );

      return {
        success: true,
        message: 'Data synced from Gescom to Sales',
        salesResponse
      };
    } catch (error) {
      this.logger.error(`Error syncing Gescom data: ${error.message}`);
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('health')
  async getHealth() {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.salesServiceUrl}/health`),
      );
      return { ...response.data, gateway: 'ok' };
    } catch (error) {
      this.logger.error(`Error connecting to sales service: ${error.message}`);
      throw new HttpException(
        'Sales service unavailable',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  @Post('route-validator/recorrido/upload')
  @UseInterceptors(FileFieldsInterceptor([{ name: 'file', maxCount: 1 }]))
  async uploadRecorrido(@UploadedFiles() files: { file?: Express.Multer.File[] }) {
    const file = files.file?.[0];
    if (!file) throw new HttpException('File is required', HttpStatus.BAD_REQUEST);

    const formData = new FormData();
    formData.append('file', file.buffer, {
      filename: file.originalname,
      contentType: file.mimetype,
    });

    try {
      const response = await firstValueFrom(
        this.httpService.post(
          `${this.salesServiceUrl}/route-validator/recorrido/upload`,
          formData,
          { headers: formData.getHeaders() },
        ),
      );
      return response.data;
    } catch (error) {
      this.logger.error(`Error uploading recorrido: ${error.message}`);
      throw new HttpException(
        error.response?.data?.detail || 'Internal server error',
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('route-validator/validate')
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'horario', maxCount: 1 },
      { name: 'recorrido', maxCount: 1 },
    ]),
  )
  async validateRoutes(
    @UploadedFiles()
    files: {
      horario?: Express.Multer.File[];
      recorrido?: Express.Multer.File[];
    },
    @Body() body: any,
    @Res() res: Response,
  ) {
    const horario = files.horario?.[0];
    const recorrido = files.recorrido?.[0];

    if (!horario)
      throw new HttpException('Horario file is required', HttpStatus.BAD_REQUEST);

    const formData = new FormData();
    formData.append('horario', horario.buffer, {
      filename: horario.originalname,
      contentType: horario.mimetype,
    });

    if (recorrido) {
      formData.append('recorrido', recorrido.buffer, {
        filename: recorrido.originalname,
        contentType: recorrido.mimetype,
      });
    }

    // Agregar el resto del body (semana_inicio, fecha_inicio, fecha_fin, format)
    Object.keys(body).forEach((key) => {
      formData.append(key, body[key]);
    });

    try {
      const response = await firstValueFrom(
        this.httpService.post(
          `${this.salesServiceUrl}/route-validator/validate`,
          formData,
          {
            headers: formData.getHeaders(),
            responseType: body.format === 'excel' ? 'arraybuffer' : 'json',
          },
        ),
      );

      if (body.format === 'excel') {
        res.set({
          'Content-Type':
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': 'attachment; filename=Reporte_Ruta.xlsx',
        });
        return res.send(response.data);
      }

      return res.status(HttpStatus.OK).json(response.data);
    } catch (error) {
      this.logger.error(`Error in validateRoutes proxy: ${error.message}`);
      throw new HttpException(
        error.response?.data?.detail || 'Internal server error',
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('route-validator/save-batch')
  async saveBatch(@Body() body: any) {
    try {
      const response = await firstValueFrom(
        this.httpService.post(
          `${this.salesServiceUrl}/route-validator/save-batch`,
          body,
        ),
      );
      return response.data;
    } catch (error) {
      this.logger.error(`Error saving batch: ${error.message}`);
      throw new HttpException(
        error.response?.data?.detail || 'Internal server error',
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('route-validator/history')
  async getHistory() {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.salesServiceUrl}/route-validator/history`),
      );
      return response.data;
    } catch (error) {
      this.logger.error(`Error getting history: ${error.message}`);
      throw new HttpException(
        error.response?.data?.detail || 'Internal server error',
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('route-validator/recorrido')
  async listRecorridos(
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
    @Query('search_vendedor') search_vendedor?: string,
    @Query('search_cliente') search_cliente?: string,
    @Query('linea') linea?: string,
    @Query('bloque') bloque?: string,
    @Query('semana') semana?: number,
    @Query('dia') dia?: string,
  ) {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.salesServiceUrl}/route-validator/recorrido`, {
          params: { limit, offset, search_vendedor, search_cliente, linea, bloque, semana, dia }
        }),
      );
      return response.data;
    } catch (error) {
      this.logger.error(`Error listing recorridos: ${error.message}`);
      throw new HttpException(
        error.response?.data?.detail || 'Internal server error',
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('route-validator/recorrido/:id')
  async getRecorrido(@Param('id') id: string) {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.salesServiceUrl}/route-validator/recorrido/${id}`),
      );
      return response.data;
    } catch (error) {
      this.logger.error(`Error getting recorrido: ${error.message}`);
      throw new HttpException(
        error.response?.data?.detail || 'Internal server error',
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('route-validator/recorrido')
  async createRecorrido(@Body() body: any) {
    try {
      const response = await firstValueFrom(
        this.httpService.post(`${this.salesServiceUrl}/route-validator/recorrido`, body),
      );
      return response.data;
    } catch (error) {
      this.logger.error(`Error creating recorrido: ${error.message}`);
      throw new HttpException(
        error.response?.data?.detail || 'Internal server error',
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Put('route-validator/recorrido/:id')
  async updateRecorrido(@Param('id') id: string, @Body() body: any) {
    try {
      const response = await firstValueFrom(
        this.httpService.put(`${this.salesServiceUrl}/route-validator/recorrido/${id}`, body),
      );
      return response.data;
    } catch (error) {
      this.logger.error(`Error updating recorrido: ${error.message}`);
      throw new HttpException(
        error.response?.data?.detail || 'Internal server error',
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Delete('route-validator/recorrido/:id')
  async deleteRecorrido(@Param('id') id: string) {
    try {
      const response = await firstValueFrom(
        this.httpService.delete(`${this.salesServiceUrl}/route-validator/recorrido/${id}`),
      );
      return response.data;
    } catch (error) {
      this.logger.error(`Error deleting recorrido: ${error.message}`);
      throw new HttpException(
        error.response?.data?.detail || 'Internal server error',
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
