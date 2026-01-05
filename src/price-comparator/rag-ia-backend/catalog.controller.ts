import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
  Body,
  Inject,
  BadRequestException,
  Logger,
  Get,
  Param,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { ClientProxy } from '@nestjs/microservices';
import { v4 as uuid } from 'uuid';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { ConfigService } from '@nestjs/config';

@Controller('rag-backend')
export class CatalogController {
  private readonly logger = new Logger(CatalogController.name);

  constructor(
    @Inject('RAG_IA_BACKEND_SERVICE')
    private readonly ragIaBackendClient: ClientProxy,
    private readonly httpService: HttpService,
  ) {}

  // Método 1: Flujo original por Redis (mantener compatibilidad)
  @Post('catalog')
  @UseInterceptors(
    FilesInterceptor('files', 20, {
      dest: './temp_uploads',
      fileFilter: (req, file, callback) => {
        if (!file.originalname.match(/\.(jpg|jpeg|png|pdf)$/)) {
          return callback(
            new BadRequestException(
              'Only image (jpg, jpeg, png) and PDF files are allowed!',
            ),
            false,
          );
        }
        callback(null, true);
      },
    }),
  )
  async upload(@UploadedFiles() files: Array<Express.Multer.File>) {
    const jobId = uuid();

    if (!files || files.length === 0) {
      throw new BadRequestException('At least one file is required');
    }

    const fileData = files.map((f) => ({
      path: f.path,
      originalname: f.originalname,
      mimetype: f.mimetype,
      size: f.size,
    }));

    this.logger.log(
      `Gateway: Received ${files.length} files. Job ID: ${jobId}`,
    );

    // Enviar por Redis
    this.ragIaBackendClient.emit('catalog_received', {
      jobId,
      files: fileData,
    });

    return {
      jobId,
      status: 'queued',
      message: 'Files queued for processing via Redis',
      webSocket: {
        server: 'ws://localhost:3002',
        room: jobId,
        event: 'joinJobRoom',
        example: `Send: {"event": "joinJobRoom", "data": "${jobId}"}`,
      },
    };
  }

  // Corregir el método uploadDirect:
  @Post('catalog-direct')
  @UseInterceptors(
    FilesInterceptor('files', 20, {
      dest: './temp_uploads/direct',
      fileFilter: (req, file, callback) => {
        if (!file.originalname.match(/\.(jpg|jpeg|png|pdf)$/)) {
          return callback(
            new BadRequestException(
              'Only image (jpg, jpeg, png) and PDF files are allowed!',
            ),
            false,
          );
        }
        callback(null, true);
      },
    }),
  )
  async uploadDirect(@UploadedFiles() files: Array<Express.Multer.File>) {
    if (!files || files.length === 0) {
      throw new BadRequestException('At least one file is required');
    }

    const jobId = uuid();
    this.logger.log(`Direct upload: ${files.length} files. Job ID: ${jobId}`);

    try {
      // URL del price comparator
      //const priceComparatorUrl =
      //process.env.PRICE_COMPARATOR_URL || 'http://localhost:3002';
      const priceComparatorUrl = 'http://localhost:3002';

      // Preparar datos para enviar (SOLUCIÓN DEL ERROR)
      const fileData = files.map((f) => ({
        path: f.path,
        originalname: f.originalname,
        mimetype: f.mimetype,
        size: f.size,
      }));

      this.logger.log(
        `Sending to ${priceComparatorUrl}/catalog-upload/upload-from-paths`,
      );

      // Enviar al price comparator
      const response = await firstValueFrom(
        this.httpService.post(`${priceComparatorUrl}/catalog/upload`, {
          jobId,
          files: fileData,
        }),
      );

      return {
        jobId,
        status: 'processing',
        message: 'Files sent directly to price comparator',
        webSocket: {
          url: 'http://localhost:3002', // Cambiar de ws:// a http:// para Socket.io
          room: jobId,
          events: ['job_status', 'products_found', 'image_error', 'job_error'],
          connectCommand: JSON.stringify({ event: 'joinJobRoom', data: jobId }),
          instructions: [
            '1. Use Socket.io client (not raw WebSocket)',
            '2. Connect to: http://localhost:3002',
            '3. Send: {"event": "joinJobRoom", "data": "' + jobId + '"}',
          ],
        },
        response: response.data,
      };
    } catch (error: any) {
      this.logger.error('Error in direct upload:', error.message || error);
      this.logger.error('Full error:', error);

      // Fallback: usar Redis si falla HTTP directo
      this.logger.log('Falling back to Redis transport...');

      const fileData = files.map((f) => ({
        path: f.path,
        originalname: f.originalname,
        mimetype: f.mimetype,
        size: f.size,
      }));

      this.ragIaBackendClient.emit('catalog_received', {
        jobId,
        files: fileData,
      });

      return {
        jobId,
        status: 'queued_fallback',
        message: 'Using Redis transport (HTTP direct failed)',
        webSocket: {
          server: 'http://localhost:3002',
          room: jobId,
          event: 'joinJobRoom',
        },
        error: error.message || 'Unknown error',
      };
    }
  }

  // Método para consultar estado de un job
  @Get('job/:jobId/status')
  async getJobStatus(@Param('jobId') jobId: string) {
    try {
      //const priceComparatorUrl =
      //process.env.PRICE_COMPARATOR_URL || 'http://localhost:3002';
      const priceComparatorUrl = 'http://localhost:3002';
      const response = await firstValueFrom(
        this.httpService.get(`${priceComparatorUrl}/catalog/job/${jobId}`),
      );

      return {
        jobId,
        ...response.data,
        gateway: 'status_retrieved',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error(`Error getting job status ${jobId}:`, error);

      return {
        jobId,
        status: 'unknown',
        message: 'Unable to retrieve job status from price comparator',
        error: error.message,
        timestamp: new Date().toISOString(),
        suggestion: 'Check if job exists or try reconnecting via WebSocket',
      };
    }
  }

  // Método para obtener resultados completos
  @Get('job/:jobId/results')
  async getJobResults(@Param('jobId') jobId: string) {
    try {
      const priceComparatorUrl =
        process.env.PRICE_COMPARATOR_URL || 'http://localhost:3002';

      const response = await firstValueFrom(
        this.httpService.get(
          `${priceComparatorUrl}/catalog/job/${jobId}/results`,
        ),
      );

      return {
        jobId,
        ...response.data,
        gateway: 'results_retrieved',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error(`Error getting job results ${jobId}:`, error);

      return {
        jobId,
        status: 'error',
        message: 'Failed to retrieve job results',
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  // Método para listar jobs activos
  @Get('jobs/active')
  async getActiveJobs() {
    try {
      const priceComparatorUrl =
        process.env.PRICE_COMPARATOR_URL || 'http://localhost:3002';

      const response = await firstValueFrom(
        this.httpService.get(`${priceComparatorUrl}/catalog/jobs/active`),
      );

      return {
        ...response.data,
        gateway: 'active_jobs_retrieved',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('Error getting active jobs:', error);

      return {
        success: false,
        message: 'Unable to retrieve active jobs',
        error: error.message,
        jobs: [],
        timestamp: new Date().toISOString(),
      };
    }
  }

  // Mantener métodos existentes sin cambios...
  @Post('upload-excel')
  @UseInterceptors(FileInterceptor('excel'))
  async uploadExcel(@UploadedFile() excelFile: Express.Multer.File) {
    if (!excelFile) {
      throw new BadRequestException('Excel file is required');
    }

    this.logger.log(
      `Gateway: Received Excel file ${excelFile.originalname}. Sending to rag_ia_backend service.`,
    );

    return await firstValueFrom(
      this.ragIaBackendClient.send(
        { cmd: 'upload_excel' },
        { file: excelFile },
      ),
    );
  }

  @Post('process-re-ranking')
  async processReRanking(@Body() body: { query: string; limit?: number }) {
    this.logger.log(
      `Gateway: Received re-ranking request for re-ranking. Sending to rag_ia_backend service.`,
    );

    return await firstValueFrom(
      this.ragIaBackendClient.send({ cmd: 'rerank_product_matches' }, body),
    );
  }

  @Post('manual-product-search')
  async manualProductSearch(@Body() body: any) {
    this.logger.log(`Gateway: Sending manual search for query: ${body.query}`);

    return await firstValueFrom(
      this.ragIaBackendClient.send(
        { cmd: 'manual_product_search' },
        {
          query: body.query,
          limit: body.limit || 5,
        },
      ),
    );
  }



  @Get('health-check')
  async healthCheck() {
    return {
      service: 'gateway',
      status: 'running',
      timestamp: new Date().toISOString(),
      priceComparator: 'http://localhost:3002',
      instructions: {
        testPriceComparator: 'GET http://localhost:3002/catalog/health', // ← Correcto
        uploadFile: 'POST http://localhost:3002/catalog/upload',
        checkJobs: 'GET http://localhost:3002/catalog/jobs/active',
      },
    };
  }
}
