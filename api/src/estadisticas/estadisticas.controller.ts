import { Controller, Get, Inject } from '@nestjs/common';
import { EstadisticasService } from './estadisticas.service';

@Controller('estadisticas')
export class EstadisticasController {
  constructor(@Inject(EstadisticasService) private readonly estadisticas: EstadisticasService) {}

  @Get()
  resumen() {
    return this.estadisticas.resumen();
  }
}
