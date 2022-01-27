import { DiscoverableRepository, Repository } from '@org/shared/data-access';

@DiscoverableRepository
export class FooRepository implements Repository {
  check() {
    return FooRepository.name;
  }
}
