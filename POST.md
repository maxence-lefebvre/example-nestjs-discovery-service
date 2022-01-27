# Context

There is quite a feature available in [NestJS][nestjs] that is, as of today, still undocumented.

I recently joined a new project, and there is a `monitoring service` that needs to access all `repositories` running in our app.

I was surprised that there didn't seem to be a better way that injecting manually all of them:

```typescript
@Injectable()
export class MonitoringService {
  private readonly repositories: Repository[];

  constructor(
    fooRepository: FooRepository,
    barRepository: BarRepository
    /* ... */
  ) {
    this.repositories = [
      fooRepository,
      barRepository,
      /* ... */
    ];
  }
}
```

As I was _discovering_ this service, a few things came in mind:

> How many times did my team forget to add their repositories in this service ?
> I can't fathom how much pain they felt to maintain this list and how poor the DX must be.
> I don't want to do this.

# Pimp my services

There are already a lot of decorators in the NestJS ecosystem, and they mostly work all the same: by setting Reflection Metadata to the target.

So let's start by doing the same and define a custom metadata through a custom decorator:

```typescript
/// `registry.constants.ts`

export const REGISTRY_METADATA_KEY = Symbol('__my-app--registry__');

///

import { SetMetadata } from '@nestjs/common';

import { REGISTRY_METADATA_KEY } from './registry.constants';

export const Discover = (v: unknown) => SetMetadata(REGISTRY_METADATA_KEY, v);
```

**NB**: `SetMetadata` is [documented for route handlers](https://docs.nestjs.com/fundamentals/execution-context#reflection-and-metadata), with the usage of NestJS's `Reflector`.

Now we can start to tag the repositories:

```typescript
import { Discover } from '@org/shared/kernel/registry';

@Injectable()
@Discover('repository')
export class FooRepository implements Repository {}

@Injectable()
@Discover('repository')
export class BarRepository implements Repository {}
```

You know the drill, we can also define a custom `Repository` decorator:

```typescript
import { Discover } from '@org/shared/kernel/registry';
import { composeDecorators } from '@org/shared/lang-extensions/typescript';

export const DiscoverableRepository = composeDecorators(
  Injectable(),
  Discover('repository')
);

///

import { DiscoverableRepository } from '@org/shared/data-access';

@DiscoverableRepository
export class FooRepository implements Repository {}

@DiscoverableRepository
export class BarRepository implements Repository {}
```

# Bring them all

Let's define our Registry which will use the DiscoveryService to find all providers tagged with our custom `Metadata`.

```typescript
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
```

Don't forget to import the `DiscoveryModule` !

```typescript
import { Module } from '@nestjs/common';
import { DiscoveryModule } from '@nestjs/core';

import { Registry } from './registry';

@Module({
  imports: [DiscoveryModule],
  providers: [Registry],
  exports: [Registry],
})
export class RegistryModule {}
```

# And in the darkness, bind them.

Now that we tagged our services and now that we can find them all, let's refactor our pain point:

Before:

```typescript
@Injectable()
export class MonitoringService {
  private readonly repositories: Repository[];

  constructor(
    fooRepository: FooRepository,
    barRepository: BarRepository
    /* ... */
  ) {
    this.repositories = [
      fooRepository,
      barRepository,
      /* ... */
    ];
  }
}
```

After:

```typescript
import { OnModuleInit } from '@nestjs/common';
import { Registry } from '@org/shared/kernel/registry';

@Injectable()
export class MonitoringService implements OnModuleInit {
  private repositories: Repository[] = [];

  constructor(private readonly registry: Registry) {}

  onModuleInit(): void {
    this.repositories = this.registry.getProviders<Repository[]>('repository');
  }
}
```

# Thoughts

## No really private providers

Even if your tagged providers aren't exported anywhere, NestJS's `DiscoveryService` will be able to discover them.

I find this behaviour quite great, since it allows me to discover them without forcing me to expose services I don't want available for DI.

However, this worries me since nothing can really reassure me that another module isn't mutating/patching my "private" providers instances at runtime.

## Controllers

`DiscoveryService` exposes `getControllers()` too, since they are treated differently than a provider in NestJS.

You may need to extend the previous snippets to handle them as well, if you need.

## Global

I couldn't tell if it would be a good idea to make RegistryModule a global module.

## Lifecycle

I hooked the explorer to `onModuleInit` but I probably should have waited to load the providers later, like during `onApplicationBootstrap`.

I am not confident enough in my knowledge of the lifecycle to tell today.

I guess all providers are already registered during `onModuleInit` ?

# Sources

- Example repo: [https://github.com/maxence-lefebvre/example-nestjs-discovery-service](https://github.com/maxence-lefebvre/example-nestjs-discovery-service)
- `DiscoveryService` code: [https://github.com/nestjs/nest/blob/master/packages/core/discovery/discovery-service.ts](https://github.com/nestjs/nest/blob/master/packages/core/discovery/discovery-service.ts)

[nestjs]: https://nestjs.com/
