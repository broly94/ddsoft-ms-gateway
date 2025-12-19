import { Controller, Post, Inject, OnModuleInit } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';

@Controller('rag-etl-indexer')
export class EtlController implements OnModuleInit {
  constructor(
    @Inject('RAG_ETL_INDEXER_SERVICE')
    private readonly indexerClient: ClientProxy,
  ) {}

  async onModuleInit() {
    // Nos aseguramos de que el microservicio esté conectado al iniciar
    await this.indexerClient.connect();
  }

  @Post('trigger-indexing')
  async triggerProductIndexing() {
    console.log(
      'Gateway: Petición HTTP recibida para iniciar la indexación. Enviando mensaje a rag-etl-indexer...',
    );
    const response = await firstValueFrom(
      this.indexerClient.send({ cmd: 'trigger_product_indexing' }, {}),
    );
    return response;
  }
}
