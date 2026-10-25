import { Body, Controller, Delete, Get, Headers, Inject, Param, Post, Put, Query, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import type { Principal } from '../common/principal';
import { Roles } from '../common/roles.decorator';
import { GuardarSoporteDto, ListarSoportesDto } from './soporte.dto';
import { SoportesService } from './soportes.service';

@Controller('soportes')
export class SoportesController {
  constructor(@Inject(SoportesService) private readonly soportes: SoportesService) {}

  @Get()
  listar(@Query() query: ListarSoportesDto) {
    return this.soportes.listar(query);
  }

  @Get('pdf')
  async pdfLista(@Query() query: ListarSoportesDto, @Res() response: Response): Promise<void> {
    const pdf = await this.soportes.imprimirLista(query);
    response.setHeader('Content-Type', 'application/pdf');
    response.setHeader('Content-Disposition', 'inline; filename="bitacora-soportes.pdf"');
    response.send(pdf);
  }

  @Get(':id/pdf')
  async pdfUno(@Param('id') id: string, @Res() response: Response): Promise<void> {
    const pdf = await this.soportes.imprimirUno(id);
    response.setHeader('Content-Type', 'application/pdf');
    response.setHeader('Content-Disposition', `inline; filename="soporte-${id}.pdf"`);
    response.send(pdf);
  }

  @Get('export')
  async exportar(@Query() query: ListarSoportesDto, @Res() response: Response): Promise<void> {
    const csv = await this.soportes.exportar(query);
    response.setHeader('Content-Type', 'text/csv; charset=utf-8');
    response.setHeader('Content-Disposition', 'attachment; filename="bitacora-soportes.csv"');
    response.send(`\uFEFF${csv}`);
  }

  @Get(':id')
  obtener(@Param('id') id: string) {
    return this.soportes.obtener(id);
  }

  @Post()
  crear(
    @Body() dto: GuardarSoporteDto,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Req() request: Request & { user: Principal },
    @Res({ passthrough: true }) response: Response,
  ) {
    response.status(201);
    return this.soportes.crear(request.user, dto, idempotencyKey).then((soporte) => {
      response.setHeader('Location', `/api/v1/soportes/${soporte.id}`);
      return soporte;
    });
  }

  @Put(':id')
  actualizar(
    @Param('id') id: string,
    @Body() dto: GuardarSoporteDto,
    @Headers('if-match') ifMatch: string | undefined,
  ) {
    return this.soportes.actualizar(id, dto, ifMatch);
  }

  @Delete(':id')
  @Roles('admin')
  async eliminar(
    @Param('id') id: string,
    @Headers('if-match') ifMatch: string | undefined,
    @Req() request: Request & { user: Principal },
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    await this.soportes.eliminar(request.user, id, ifMatch);
    response.status(204);
  }
}
