import {
  Module,
} from '@nestjs/common';

import {
  TypeOrmModule,
} from '@nestjs/typeorm';

import {
  Gym,
} from '../gym/gym.entity';

import {
  Turnstile,
} from './turnstile.entity';

import {
  TurnstileEvent,
} from './turnstile-event.entity';

import {
  TurnstileService,
} from './turnstile.service';

import {
  TurnstileController,
} from './turnstile.controller';

import {
  TURNSTILE_PROVIDER,
} from './turnstile-provider.interface';

import {
  MockTurnstileProvider,
} from './mock-turnstile.provider';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Gym,
      Turnstile,
      TurnstileEvent,
    ]),
  ],

  controllers: [
    TurnstileController,
  ],

  providers: [
    TurnstileService,
    MockTurnstileProvider,
    {
      provide:
        TURNSTILE_PROVIDER,
      useExisting:
        MockTurnstileProvider,
    },
  ],

  exports: [
    TurnstileService,
  ],
})
export class TurnstileModule {}
