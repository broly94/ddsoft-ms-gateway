import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { EtlController } from '@/price-comparator/rag-etl-indexer/etl.controller';
import { CatalogController } from '@/price-comparator/rag-ia-backend/catalog.controller';

@Module({
  imports: [
    ClientsModule.register([
      {
        name: 'RAG_IA_BACKEND_SERVICE',
        transport: Transport.REDIS,
        options: {
          host: process.env.REDIS_HOST || 'localhost',
          port: parseInt(process.env.REDIS_PORT as string, 10) || 6379,
        },
      },
      {
        name: 'RAG_ETL_INDEXER_SERVICE',
        transport: Transport.REDIS,
        options: {
          host: process.env.REDIS_HOST || 'localhost',
          port: parseInt(process.env.REDIS_PORT as string, 10) || 6379,
        },
      },
    ]),
  ],
  controllers: [EtlController, CatalogController],
  providers: [],
})
export class PriceComparatorModule {}
