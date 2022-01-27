import { Injectable } from '@nestjs/common';

import { Discover } from '@org/shared/kernel/registry';
import { composeDecorators } from '@org/shared/lang-extensions/typescript';

export const REPOSITORY_PROVIDER = 'repository';

export const DiscoverableRepository = composeDecorators(
  Injectable(),
  Discover(REPOSITORY_PROVIDER)
);
