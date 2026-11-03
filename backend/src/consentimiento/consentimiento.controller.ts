import { Body, Controller, Get, ParseUUIDPipe, Post } from '@nestjs/common';
import { ConsentimientoService } from './consentimiento.service';

/**
 * Endpoints públicos: se usan antes de que exista una cuenta (CU 2).
 * Rechazar la cláusula no llama al backend, así no se guarda nada (RF-79).
 */
@Controller('consentimiento')
export class ConsentimientoController {
  constructor(private readonly servicio: ConsentimientoService) {}

  @Get('politica-vigente')
  async politicaVigente() {
    const politica = await this.servicio.obtenerPoliticaVigente();
    return {
      id: politica.id,
      version: politica.version,
      texto: politica.texto,
      vigenteDesde: politica.vigenteDesde,
    };
  }

  @Post()
  async aceptar(
    @Body('politicaId', new ParseUUIDPipe({ version: '4' })) politicaId: string,
  ) {
    const consentimiento = await this.servicio.registrarAceptacion(politicaId);
    return {
      id: consentimiento.id,
      version: consentimiento.politica.version,
      fechaHora: consentimiento.fechaHora,
    };
  }
}
