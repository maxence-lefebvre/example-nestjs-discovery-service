import { Module } from '@nestjs/common';
import { LoggerModule } from 'nestjs-pino';
import { MonitoringModule } from '@org/shared/kernel/monitoring';
import { FoobarDataModule } from '@org/features/foobar/data-access';

@Module({
  imports: [
    LoggerModule.forRoot({
      pinoHttp: {
        transport: process.env.NODE_ENV !== 'production' ? { target: 'pino-pretty' } : undefined,
      }
    }),
    MonitoringModule,
    FoobarDataModule
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
