import { Module } from '@nestjs/common';
import { FooRepository } from './foo.repository';
import { BarRepository } from './bar.repository';

@Module({
  controllers: [],
  providers: [FooRepository, BarRepository],
  exports: [],
})
export class FoobarDataModule {}
