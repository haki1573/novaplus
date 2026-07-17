export type SmsProviderSendInput = {
  phone: string;
  message: string;
};

export type SmsProviderSendResult = {
  success: boolean;
  provider: string;
  messageId: string | null;
  errorCode: string | null;
  errorMessage: string | null;
};

export interface SmsProvider {
  readonly name: string;

  send(
    input: SmsProviderSendInput,
  ): Promise<SmsProviderSendResult>;
}

export const SMS_PROVIDER = Symbol(
  'SMS_PROVIDER',
);
