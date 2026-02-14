// ============================================================
// Transfer WebSocket Gateway
// Satisfies: DEFT §10 Real-Time Progress Architecture
// ============================================================
import type { TransferProgressEvent } from '@gdrivebridge/shared';

import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';

import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  namespace: '/transfers',
  cors: {
    origin: ['http://localhost:5173'],
  },
})
export class TransferGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  handleConnection(client: Socket) {
    console.log('🔌 WS Connected:', client.id);
  }

  handleDisconnect(client: Socket) {
    console.log('❌ WS Disconnected:', client.id);
  }

  // Client subscribes to specific transfer room
  @SubscribeMessage('subscribe')
  handleSubscribe(client: Socket, payload: { transferId: string }) {
    client.join(payload.transferId);
    console.log('📡 Subscribed to transfer:', payload.transferId);
  }

  // Used internally by Redis listener
  emitProgress(
    transferId: string,
    data: Omit<TransferProgressEvent, 'jobId'> & { status: string },
  ) {
    this.server.to(transferId).emit('progress', data);
  }
}
