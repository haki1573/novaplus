import { Injectable } from '@nestjs/common';
import {
  RealtimeEvent,
  RealtimeGateway,
} from './realtime.gateway';

@Injectable()
export class RealtimeService {
  constructor(
    private readonly gateway: RealtimeGateway,
  ) {}

  emit(
    gymId: string | null | undefined,
    event: RealtimeEvent,
    entityId?: string | number | null,
  ) {
    const normalizedGymId = String(gymId || '').trim();

    if (!normalizedGymId) {
      return;
    }

    this.gateway.emitToGym(
      normalizedGymId,
      event,
      entityId,
    );
  }
}
