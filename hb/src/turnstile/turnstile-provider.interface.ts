export interface TurnstileOpenResult {
  success: boolean;
  message: string;
}

export interface TurnstileProvider {
  openGate(input: {
    turnstileId: string;
    ipAddress?: string | null;
    serialNumber?: string | null;
    reason?: string | null;
  }): Promise<TurnstileOpenResult>;
}

export const TURNSTILE_PROVIDER =
  Symbol('TURNSTILE_PROVIDER');
