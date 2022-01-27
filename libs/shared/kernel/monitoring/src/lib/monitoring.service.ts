import { Injectable, OnModuleInit } from '@nestjs/common';
import { Repository, REPOSITORY_PROVIDER } from '@org/shared/data-access';
import { Registry } from '@org/shared/kernel/registry';

@Injectable()
export class MonitoringService implements OnModuleInit {
  private repositories: Repository[] = [];

  constructor(private readonly registry: Registry) {}

  onModuleInit(): void {
    this.repositories = this.registry.getProviders(REPOSITORY_PROVIDER);
  }

  check(): string[] {
    return this.repositories.map((repository) => repository.check());
  }
}
