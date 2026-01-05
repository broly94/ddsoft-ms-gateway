import { Controller, Get, Inject, Logger, BadRequestException } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';

@Controller('gescom-data-access')
export class GescomController {
  private readonly logger = new Logger(GescomController.name);

  constructor(@Inject('GESCOM_SERVICE') private readonly client: ClientProxy) {}

  @Get('health')
  healthCheck() {
    return this.client.send('health-check', {});
  }

  @Get('sellers')
  async getSellers() {
    this.logger.log(
      `Gateway: Solicitando todos los vendedores a gescom-data-access.`,
    );
    // Aquí deberías definir los IDs de los supervisores que quieres consultar.
    // Por ahora, usaremos un array de ejemplo.
    // En una aplicación real, estos IDs podrían venir de un parámetro de ruta,
    // de un cuerpo de solicitud, o de un servicio de autenticación/autorización.
    const supervisorIds = [1, 5, 7]; // Ejemplo de IDs de supervisores

    try {
      const sellers = await firstValueFrom(
        this.client.send(
          { cmd: 'get_sellers_by_supervisors' },
          { supervisorIds: supervisorIds },
        ),
      );
      this.logger.log(`Gateway: ${sellers ? sellers.length : 0} vendedores recibidos.`);
      return sellers;
    } catch (error) {
      this.logger.error('Error al obtener vendedores:', error);
      throw new BadRequestException(
        'Error al obtener vendedores de gescom-data-access.',
      );
    }
  }
}
