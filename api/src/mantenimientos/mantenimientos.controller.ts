import { Body, Controller, Delete, Get, Headers, Inject, Param, Post, Put, Query, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import type { Principal } from '../common/principal';
import { Roles } from '../common/roles.decorator';
import { CrearEquipoDto, GuardarCorrectivoDto, GuardarPreventivoDto, ListarEquiposDto, ListarMantenimientoDto } from './mantenimiento.dto';
import { MantenimientosService } from './mantenimientos.service';

@Controller('equipos')
export class EquiposController {
  constructor(@Inject(MantenimientosService) private readonly mantenimientos: MantenimientosService) {}

  @Get()
  listar(@Query() query: ListarEquiposDto) {
    return this.mantenimientos.buscarEquipos(query.q, query.areaId, query.limit ?? 20);
  }

  @Post()
  crear(@Body() dto: CrearEquipoDto, @Res({ passthrough: true }) response: Response) {
    response.status(201);
    return this.mantenimientos.crearEquipo(dto.descripcion, dto.areaId).then((equipo) => {
      response.setHeader('Location', `/api/v1/equipos/${equipo.id}`);
      return equipo;
    });
  }
}

@Controller('mantenimientos')
export class MantenimientosResumenController {
  constructor(@Inject(MantenimientosService) private readonly mantenimientos: MantenimientosService) {}

  @Get('resumen')
  resumen() {
    return this.mantenimientos.resumen();
  }
}

@Controller('mantenimientos/preventivos')
export class PreventivosController {
  constructor(@Inject(MantenimientosService) private readonly mantenimientos: MantenimientosService) {}

  @Get()
  listar(@Query() query: ListarMantenimientoDto) {
    return this.mantenimientos.listarPreventivos(query);
  }

  @Post()
  crear(
    @Body() dto: GuardarPreventivoDto,
    @Headers('idempotency-key') key: string | undefined,
    @Req() request: Request & { user: Principal },
    @Res({ passthrough: true }) response: Response,
  ) {
    response.status(201);
    return this.mantenimientos.crearPreventivo(request.user, dto, key).then((item) => {
      response.setHeader('Location', `/api/v1/mantenimientos/preventivos/${item.id}`);
      return item;
    });
  }

  @Put(':id')
  actualizar(@Param('id') id: string, @Body() dto: GuardarPreventivoDto, @Headers('if-match') ifMatch: string | undefined) {
    return this.mantenimientos.actualizarPreventivo(id, dto, ifMatch);
  }

  @Delete(':id')
  @Roles('admin')
  async eliminar(
    @Param('id') id: string,
    @Headers('if-match') ifMatch: string | undefined,
    @Req() request: Request & { user: Principal },
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    await this.mantenimientos.eliminarPreventivo(request.user, id, ifMatch);
    response.status(204);
  }
}

@Controller('mantenimientos/correctivos')
export class CorrectivosController {
  constructor(@Inject(MantenimientosService) private readonly mantenimientos: MantenimientosService) {}

  @Get()
  listar(@Query() query: ListarMantenimientoDto) {
    return this.mantenimientos.listarCorrectivos(query);
  }

  @Post()
  crear(
    @Body() dto: GuardarCorrectivoDto,
    @Headers('idempotency-key') key: string | undefined,
    @Req() request: Request & { user: Principal },
    @Res({ passthrough: true }) response: Response,
  ) {
    response.status(201);
    return this.mantenimientos.crearCorrectivo(request.user, dto, key).then((item) => {
      response.setHeader('Location', `/api/v1/mantenimientos/correctivos/${item.id}`);
      return item;
    });
  }

  @Put(':id')
  actualizar(@Param('id') id: string, @Body() dto: GuardarCorrectivoDto, @Headers('if-match') ifMatch: string | undefined) {
    return this.mantenimientos.actualizarCorrectivo(id, dto, ifMatch);
  }

  @Delete(':id')
  @Roles('admin')
  async eliminar(
    @Param('id') id: string,
    @Headers('if-match') ifMatch: string | undefined,
    @Req() request: Request & { user: Principal },
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    await this.mantenimientos.eliminarCorrectivo(request.user, id, ifMatch);
    response.status(204);
  }
}
