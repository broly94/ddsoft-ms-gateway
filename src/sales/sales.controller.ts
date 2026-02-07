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
  Patch,
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

  @Post('route-validator/check-conflicts')
  async checkConflicts(@Body() body: any) {
    try {
      const response = await firstValueFrom(
        this.httpService.post(
          `${this.salesServiceUrl}/route-validator/check-conflicts`,
          body,
        ),
      );
      return response.data;
    } catch (error) {
      this.logger.error(`Error checking conflicts: ${error.message}`);
      throw new HttpException(
        error.response?.data?.detail || 'Internal server error',
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('route-validator/delete-by-date')
  async deleteByDate(@Body() body: any) {
    try {
      const response = await firstValueFrom(
        this.httpService.post(
          `${this.salesServiceUrl}/route-validator/delete-by-date`,
          body,
        ),
      );
      return response.data;
    } catch (error) {
      this.logger.error(`Error deleting by date: ${error.message}`);
      throw new HttpException(
        error.response?.data?.detail || 'Internal server error',
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
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

    const formData = new FormData();
    
    if (horario) {
      formData.append('horario', horario.buffer, {
        filename: horario.originalname,
        contentType: horario.mimetype,
      });
    }

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

  @Get('route-validator/history/:batchId/details')
  async getBatchDetails(@Param('batchId') batchId: string) {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.salesServiceUrl}/route-validator/history/${batchId}/details`),
      );
      return response.data;
    } catch (error) {
      this.logger.error(`Error getting batch details: ${error.message}`);
      throw new HttpException(
        error.response?.data?.detail || 'Internal server error',
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('route-validator/history/:batchId/hours')
  async getBatchHours(@Param('batchId') batchId: string) {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.salesServiceUrl}/route-validator/history/${batchId}/hours`),
      );
      return response.data;
    } catch (error) {
      this.logger.error(`Error getting batch hours: ${error.message}`);
      throw new HttpException(
        error.response?.data?.detail || 'Internal server error',
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Delete('route-validator/history/:batchId')
  async deleteBatch(@Param('batchId') batchId: string) {
    try {
      const response = await firstValueFrom(
        this.httpService.delete(`${this.salesServiceUrl}/route-validator/history/${batchId}`),
      );
      return response.data;
    } catch (error) {
      this.logger.error(`Error deleting batch: ${error.message}`);
      throw new HttpException(
        error.response?.data?.detail || 'Internal server error',
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('route-validator/frecuencia/recent')
  async getRecentFrecuencia(
    @Query('limit') limit?: number,
    @Query('vendedor') vendedor?: string,
    @Query('cliente') cliente?: string,
    @Query('batch_id') batch_id?: string,
  ) {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.salesServiceUrl}/route-validator/frecuencia/recent`, {
          params: { limit, vendedor, cliente, batch_id }
        }),
      );
      return response.data;
    } catch (error) {
      this.logger.error(`Error getting recent frecuencia: ${error.message}`);
      throw new HttpException(
        error.response?.data?.detail || 'Internal server error',
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('route-validator/frecuencia/summary')
  async getFrecuenciaSummary(
    @Query('vendedor') vendedor?: string,
    @Query('batch_id') batch_id?: string,
    @Query('fecha_desde') fecha_desde?: string,
    @Query('fecha_hasta') fecha_hasta?: string,
  ) {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.salesServiceUrl}/route-validator/frecuencia/summary`, {
          params: { vendedor, batch_id, fecha_desde, fecha_hasta }
        }),
      );
      return response.data;
    } catch (error) {
      this.logger.error(`Error getting frecuencia summary: ${error.message}`);
      throw new HttpException(
        error.response?.data?.detail || 'Internal server error',
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('route-validator/horas-detalle')
  async getHorasDetalle(
    @Query('vendedor') vendedor: string,
    @Query('fecha_desde') fecha_desde: string,
    @Query('fecha_hasta') fecha_hasta: string,
  ) {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.salesServiceUrl}/route-validator/horas-detalle`, {
          params: { vendedor, fecha_desde, fecha_hasta }
        }),
      );
      return response.data;
    } catch (error) {
      this.logger.error(`Error getting horas detalle: ${error.message}`);
      throw new HttpException(
        error.response?.data?.detail || 'Internal server error',
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('route-validator/horas/summary')
  async getHorasSummary(
    @Query('vendedor') vendedor?: string,
    @Query('batch_id') batch_id?: string,
    @Query('batch_ids') batch_ids?: string,
    @Query('fecha_desde') fecha_desde?: string,
    @Query('fecha_hasta') fecha_hasta?: string,
  ) {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.salesServiceUrl}/route-validator/horas/summary`, {
          params: { vendedor, batch_id, batch_ids, fecha_desde, fecha_hasta }
        }),
      );
      return response.data;
    } catch (error) {
      this.logger.error(`Error getting horas summary: ${error.message}`);
      throw new HttpException(
        error.response?.data?.detail || 'Internal server error',
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('route-validator/horas/:vendedor/details')
  async getHorasVendedorDetalleMulti(
    @Param('vendedor') vendedor: string,
    @Query('batch_id') batch_id?: string,
    @Query('batch_ids') batch_ids?: string,
  ) {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.salesServiceUrl}/route-validator/horas/${vendedor}/details`, {
          params: { batch_id, batch_ids }
        }),
      );
      return response.data;
    } catch (error) {
      this.logger.error(`Error getting horas vendedor details multi: ${error.message}`);
      throw new HttpException(
        error.response?.data?.detail || 'Internal server error',
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('route-validator/horas/:vendedor/:batchId/details')
  async getHorasVendedorDetalle(
    @Param('vendedor') vendedor: string,
    @Param('batchId') batchId: string,
  ) {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.salesServiceUrl}/route-validator/horas/${vendedor}/${batchId}/details`),
      );
      return response.data;
    } catch (error) {
      this.logger.error(`Error getting horas vendedor details: ${error.message}`);
      throw new HttpException(
        error.response?.data?.detail || 'Internal server error',
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('route-validator/horas/batches')
  async getAvailableBatches() {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.salesServiceUrl}/route-validator/horas/batches`),
      );
      return response.data;
    } catch (error) {
      this.logger.error(`Error getting available batches: ${error.message}`);
      throw new HttpException(
        error.response?.data?.detail || 'Internal server error',
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('route-validator/horas/manual')
  async getHorasManual(
    @Query('vendedor') vendedor?: string,
    @Query('fecha_desde') fecha_desde?: string,
    @Query('fecha_hasta') fecha_hasta?: string,
  ) {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.salesServiceUrl}/route-validator/horas/manual`, {
          params: { vendedor, fecha_desde, fecha_hasta }
        }),
      );
      return response.data;
    } catch (error) {
      this.logger.error(`Error getting manual hours: ${error.message}`);
      throw new HttpException(
        error.response?.data?.detail || 'Internal server error',
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('route-validator/horas/manual')
  async upsertHoraManual(@Body() body: any) {
    try {
      const response = await firstValueFrom(
        this.httpService.post(`${this.salesServiceUrl}/route-validator/horas/manual`, body),
      );
      return response.data;
    } catch (error) {
      this.logger.error(`Error upserting manual hour: ${error.message}`);
      throw new HttpException(
        error.response?.data?.detail || 'Internal server error',
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Delete('route-validator/horas/manual/:id')
  async deleteHoraManual(@Param('id') id: string) {
    try {
      const response = await firstValueFrom(
        this.httpService.delete(`${this.salesServiceUrl}/route-validator/horas/manual/${id}`),
      );
      return response.data;
    } catch (error) {
      this.logger.error(`Error deleting manual hour: ${error.message}`);
      throw new HttpException(
        error.response?.data?.detail || 'Internal server error',
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Patch('route-validator/horas/:id/validez')
  async updateHoraValidez(
    @Param('id') id: string,
    @Body() body: { es_valido: string },
  ) {
    try {
      const response = await firstValueFrom(
        this.httpService.patch(
          `${this.salesServiceUrl}/route-validator/horas/${id}/validez`,
          body,
        ),
      );
      return response.data;
    } catch (error) {
      this.logger.error(`Error updating hora validez: ${error.message}`);
      throw new HttpException(
        error.response?.data?.detail || 'Internal server error',
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('route-validator/horas/:vendedor/raw')
  async getHorasRawDetails(
    @Param('vendedor') vendedor: string,
    @Query('fecha') fecha: string,
    @Query('batch_ids') batch_ids?: string,
  ) {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.salesServiceUrl}/route-validator/horas/${vendedor}/raw`, {
          params: { fecha, batch_ids }
        }),
      );
      return response.data;
    } catch (error) {
      this.logger.error(`Error getting raw hours details: ${error.message}`);
      throw new HttpException(
        error.response?.data?.detail || 'Internal server error',
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('route-validator/horas/split')
  async splitHoraDetalle(@Body() body: any) {
    try {
      const response = await firstValueFrom(
        this.httpService.post(
          `${this.salesServiceUrl}/route-validator/horas/split`,
          body,
        ),
      );
      return response.data;
    } catch (error) {
      this.logger.error(`Error splitting hours: ${error.message}`);
      throw new HttpException(
        error.response?.data?.detail || 'Internal server error',
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('route-validator/horas/split-raw')
  async splitRawLogs(@Body() body: any) {
    try {
      const response = await firstValueFrom(
        this.httpService.post(
          `${this.salesServiceUrl}/route-validator/horas/split-raw`,
          body,
        ),
      );
      return response.data;
    } catch (error) {
      this.logger.error(`Error splitting raw logs: ${error.message}`);
      throw new HttpException(
        error.response?.data?.detail || 'Internal server error',
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Patch('route-validator/horas/:id')
  async updateHoraDetalle(@Param('id') id: string, @Body() body: any) {
    try {
      const response = await firstValueFrom(
        this.httpService.patch(`${this.salesServiceUrl}/route-validator/horas/${id}`, body),
      );
      return response.data;
    } catch (error) {
      this.logger.error(`Error updating hora detalle: ${error.message}`);
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
      this.logger.log(`Listing recorridos: limit=${limit}, offset=${offset}, vendedor=${search_vendedor}`);
      const response = await firstValueFrom(
        this.httpService.get(`${this.salesServiceUrl}/route-validator/recorrido`, {
          params: { limit, offset, search_vendedor, search_cliente, linea, bloque, semana, dia }
        }),
      );
      this.logger.log(`Recorridos received from sales-service: ${response.data?.items?.length} items, total: ${response.data?.total}`);
      return response.data;
    } catch (error) {
      this.logger.error(`Error listing recorridos: ${error.message}`);
      if (error.response) {
        this.logger.error(`Response data: ${JSON.stringify(error.response.data)}`);
      }
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

  @Get('route-validator/vendedores')
  async getVendedores() {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.salesServiceUrl}/route-validator/vendedores`),
      );
      return response.data;
    } catch (error) {
      this.logger.error(`Error getting local vendedores: ${error.message}`);
      throw new HttpException(
        error.response?.data?.detail || 'Internal server error',
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('route-validator/vendedores/sync')
  async syncVendedores(@Body() body: any) {
    try {
      const response = await firstValueFrom(
        this.httpService.post(
          `${this.salesServiceUrl}/route-validator/sync-vendedores`,
          body,
        ),
      );
      return response.data;
    } catch (error) {
      this.logger.error(`Error syncing local vendedores: ${error.message}`);
      throw new HttpException(
        error.response?.data?.detail || 'Internal server error',
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Delete('route-validator/horas/raw-delete')
  async deleteRawLogs(@Body() body: any) {
    try {
      const response = await firstValueFrom(
        this.httpService.delete(
          `${this.salesServiceUrl}/route-validator/horas/raw-delete`,
          { data: body },
        ),
      );
      return response.data;
    } catch (error) {
      this.logger.error(`Error deleting raw logs: ${error.message}`);
      throw new HttpException(
        error.response?.data?.detail || 'Internal server error',
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('route-validator/viatico-config')
  async getViaticoSettings() {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.salesServiceUrl}/route-validator/viatico-config`),
      );
      return response.data;
    } catch (error) {
      this.logger.error(`Error getting viatico config: ${error.message}`);
      throw new HttpException(
        error.response?.data?.detail || 'Internal server error',
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Put('route-validator/viatico-config')
  async updateViaticoSettings(@Body() body: any) {
    try {
      const response = await firstValueFrom(
        this.httpService.put(
          `${this.salesServiceUrl}/route-validator/viatico-config`,
          body,
        ),
      );
      return response.data;
    } catch (error) {
      this.logger.error(`Error updating viatico config: ${error.message}`);
      throw new HttpException(
        error.response?.data?.detail || 'Internal server error',
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('route-validator/manual-override')
  async manualOverride(@Body() body: any) {
    try {
      const response = await firstValueFrom(
        this.httpService.post(
          `${this.salesServiceUrl}/route-validator/manual-override`,
          body,
        ),
      );
      return response.data;
    } catch (error) {
      this.logger.error(`Error in manual override: ${error.message}`);
      throw new HttpException(
        error.response?.data?.detail || 'Internal server error',
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
