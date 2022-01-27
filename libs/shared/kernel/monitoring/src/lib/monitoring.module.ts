import { Module } from '@nestjs/common';
import { RegistryModule } from '@org/shared/kernel/registry';

import { MonitoringService } from './monitoring.service';
import { MonitoringController } from './monitoring.controller';

@Module({
  imports: [RegistryModule],
  controllers: [MonitoringController],
  providers: [MonitoringService],
  exports: [MonitoringService],
})
export class MonitoringModule {}
