import { Controller, Get, Inject } from '@nestjs/common';
import { Public } from '../common/public.decorator';
import { DatabaseService } from '../database/database.service';

@Controller('health')
export class HealthController {
  constructor(@Inject(DatabaseService) private readonly db: DatabaseService) {}

  @Public()
  @Get('live')
  live() {
    return { status: 'ok' };
  }

  @Public()
  @Get()
  async ready() {
    await this.db.ping();
    return { status: 'ok' };
  }
}
