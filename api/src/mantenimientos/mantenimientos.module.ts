import { Module } from '@nestjs/common';
import { CorrectivosController, EquiposController, MantenimientosResumenController, PreventivosController } from './mantenimientos.controller';
import { MantenimientosService } from './mantenimientos.service';

@Module({
  controllers: [EquiposController, MantenimientosResumenController, PreventivosController, CorrectivosController],
  providers: [MantenimientosService],
})
export class MantenimientosModule {}
