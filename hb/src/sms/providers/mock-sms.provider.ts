import { Injectable } from '@nestjs/common';

import {
  SmsProvider,
  SmsProviderSendInput,
  SmsProviderSendResult,
} from './sms-provider.interface';

@Injectable()
export class MockSmsProvider
  implements SmsProvider
{
  readonly name = 'MOCK';

  async send(
    input: SmsProviderSendInput,
  ): Promise<SmsProviderSendResult> {
    const phone = String(
      input.phone || '',
    ).trim();

    const message = String(
      input.message || '',
    ).trim();

    if (!phone || !message) {
      return {
        success: false,
        provider: this.name,
        messageId: null,
        errorCode: 'INVALID_REQUEST',
        errorMessage:
          'Telefon numarası veya mesaj boş.',
      };
    }

    return {
      success: true,
      provider: this.name,
      messageId:
        `MOCK-${Date.now()}-${Math.random()
          .toString(36)
          .slice(2, 10)
          .toUpperCase()}`,
      errorCode: null,
      errorMessage: null,
    };
  }
}
