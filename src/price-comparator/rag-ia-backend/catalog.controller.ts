import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  Body,
  Inject,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { ProcessImageAndSearchDto } from '@/price-comparator/rag-ia-backend/dto/catalog-processing.dto';

@Controller('rag-backend')
export class CatalogController {
  private readonly logger = new Logger(CatalogController.name);

  constructor(
    @Inject('RAG_IA_BACKEND_SERVICE')
    private readonly ragIaBackendClient: ClientProxy,
  ) {}

  @Post('upload-excel')
  @UseInterceptors(FileInterceptor('excel'))
  async uploadExcel(@UploadedFile() excelFile: Express.Multer.File) {
    if (!excelFile) {
      throw new BadRequestException('Excel file is required');
    }

    this.logger.log(
      `Gateway: Received Excel file ${excelFile.originalname}. Sending to rag_ia_backend service.`,
    );

    // El archivo se serializa y se envía a través de Redis.
    // Express.Multer.File se convierte en un objeto plano.
    return await firstValueFrom(
      this.ragIaBackendClient.send(
        { cmd: 'upload_excel' },
        { file: excelFile },
      ),
    );
  }

  @Post('process-image-preview')
  @UseInterceptors(FileInterceptor('image'))
  async processImagePreview(
    @UploadedFile() image: Express.Multer.File,
    @Body() body: ProcessImageAndSearchDto,
  ) {
    if (!image) {
      throw new BadRequestException('Image file is required');
    }

    this.logger.log(
      `Gateway: Received image ${image.originalname} for preview. Sending to rag_ia_backend service.`,
    );

    return await firstValueFrom(
      this.ragIaBackendClient.send(
        { cmd: 'process_image_preview' },
        { image, body },
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
        // Enviamos el objeto plano
        {
          query: body.query,
          limit: body.limit || 5,
        },
      ),
    );
  }
}
