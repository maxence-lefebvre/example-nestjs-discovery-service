import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { DiscoveryService } from '@nestjs/core';
import iterate from 'iterare';

import { REGISTRY_METADATA_KEY } from './registry.constants';

@Injectable()
export class Registry implements OnModuleInit {
  private readonly logger = new Logger(Registry.name);

  private providers: Record<string | symbol, unknown[]> = {};

  constructor(private readonly discoveryService: DiscoveryService) {}

  public getProviders<T extends unknown[]>(key?: string | symbol): T {
    const providers = key
      ? this.providers[key]
      : Object.values(this.providers).flat();

    return (providers || []) as T;
  }

  onModuleInit(): void {
    this.providers = this.scanDiscoverableInstanceWrappers(
      this.discoveryService.getProviders()
    );
  }

  private scanDiscoverableInstanceWrappers(
    wrappers: { metatype: unknown | null; instance: unknown; name: string }[]
  ) {
    return iterate(wrappers)
      .filter(({ metatype }) => metatype && this.getMetadata(metatype))
      .reduce((acc, { metatype, instance, name }) => {
        const type = this.getMetadata(metatype);

        this.emitDiscoveredEvent({ type, name });

        return {
          ...acc,
          [type]: (acc[type] || []).concat(instance),
        };
      }, {});
  }

  private getMetadata(metatype: unknown) {
    return Reflect.getMetadata(REGISTRY_METADATA_KEY, metatype);
  }

  private emitDiscoveredEvent({
    type,
    name,
  }: {
    type: string | symbol;
    name: string;
  }): void {
    const event = { event: 'DISCOVERED', type: type.toString(), name };
    this.logger.log(event);
  }
}
