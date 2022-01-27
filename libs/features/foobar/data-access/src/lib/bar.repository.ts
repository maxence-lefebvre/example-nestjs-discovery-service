import { DiscoverableRepository, Repository } from '@org/shared/data-access';

@DiscoverableRepository
export class BarRepository implements Repository {
  check() {
    return BarRepository.name;
  }
}
