import {
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Socket, Server } from 'socket.io';

export type RealtimeEvent =
  | 'dashboard:update'
  | 'member:created'
  | 'member:updated'
  | 'checkin:new'
  | 'checkout:new'
  | 'cafe:sale'
  | 'wallet:topup'
  | 'notification:new'
  | 'notification:updated';

export interface RealtimePayload {
  gymId: string;
  event: RealtimeEvent;
  occurredAt: string;
  entityId?: string | number | null;
}

@WebSocketGateway({
  cors: {
    origin: true,
    credentials: true,
  },
})
export class RealtimeGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  private server!: Server;

  handleConnection(client: Socket) {
    client.emit('realtime:connected', {
      connected: true,
      occurredAt: new Date().toISOString(),
    });
  }

  handleDisconnect(_client: Socket) {}

  @SubscribeMessage('gym:join')
  joinGym(
    @ConnectedSocket() client: Socket,
    gymId: string,
  ) {
    const normalizedGymId = String(gymId || '').trim();

    if (!normalizedGymId) {
      return {
        joined: false,
      };
    }

    void client.join(`gym:${normalizedGymId}`);

    return {
      joined: true,
      gymId: normalizedGymId,
    };
  }

  emitToGym(
    gymId: string,
    event: RealtimeEvent,
    entityId?: string | number | null,
  ) {
    const payload: RealtimePayload = {
      gymId,
      event,
      occurredAt: new Date().toISOString(),
      entityId: entityId ?? null,
    };

    this.server
      .to(`gym:${gymId}`)
      .emit(event, payload);

    this.server
      .to(`gym:${gymId}`)
      .emit('dashboard:update', payload);
  }
}
