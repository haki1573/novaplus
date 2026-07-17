import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';

import type {
  SmsProvider,
} from './sms-provider.interface';

@Injectable()
export class ConsoleSmsProvider
  implements SmsProvider
{
  readonly name =
    'CONSOLE';

  async send(input: {
    phone: string;
    message: string;
  }) {
    /*
     * Geliştirme sağlayıcısı:
     * Gerçek operatöre istek göndermez.
     * Mesajı backend terminaline yazar ve başarılı kabul eder.
     */
    console.log(
      '[SMS]',
      input.phone,
      input.message,
    );

    return {
      success: true,
      provider: this.name,
      messageId:
        `console-${randomUUID()}`,
      errorCode: null,
      errorMessage: null,
    };
  }
}
