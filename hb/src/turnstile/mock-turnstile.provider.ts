import {
  Injectable,
} from '@nestjs/common';

import {
  TurnstileOpenResult,
  TurnstileProvider,
} from './turnstile-provider.interface';

@Injectable()
export class MockTurnstileProvider
  implements TurnstileProvider
{
  async openGate(): Promise<TurnstileOpenResult> {
    return {
      success: true,
      message:
        'Turnike açma komutu simülasyon sağlayıcısına gönderildi.',
    };
  }
}
