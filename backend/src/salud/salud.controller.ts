import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

/**
 * Endpoint público para comprobar que la aplicación desplegada responde y
 * llega a la base (CP-S2-03). Sin datos ni detalles técnicos.
 */
@Controller('salud')
export class SaludController {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  @Get()
  async comprobar() {
    try {
      await this.dataSource.query('SELECT 1');
    } catch {
      throw new ServiceUnavailableException({ estado: 'sin base de datos' });
    }
    return { estado: 'ok' };
  }
}
