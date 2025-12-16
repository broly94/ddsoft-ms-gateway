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
import { ProcessImageAndSearchDto } from '@/price-comparator/catalog-processing.dto';

@Controller('catalog')
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
}
