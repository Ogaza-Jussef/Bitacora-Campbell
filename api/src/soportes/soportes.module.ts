import { Module } from '@nestjs/common';
import { SoportesController } from './soportes.controller';
import { SoportesRepository } from './soportes.repository';
import { SoportesService } from './soportes.service';

@Module({
  controllers: [SoportesController],
  providers: [SoportesService, SoportesRepository],
})
export class SoportesModule {}
