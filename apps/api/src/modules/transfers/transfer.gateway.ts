import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
} from '@nestjs/websockets';

import { Server, Socket } from 'socket.io';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';

@WebSocketGateway({
  namespace: '/transfers',
  cors: {
    origin: process.env.CORS_ORIGIN?.split(',') ?? ['http://localhost:5173'],
  },
})
export class TransferGateway implements OnGatewayConnection {
  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const cookie = client.handshake.headers.cookie;

      if (!cookie) {
        client.disconnect();
        return;
      }

      const match = cookie.match(/access_token=([^;]+)/);
      if (!match) {
        client.disconnect();
        return;
      }

      const token = match[1];

      const payload = this.jwtService.verify(token);
      client.data.userId = payload.sub;
    } catch {
      client.disconnect();
    }
  }

  @SubscribeMessage('subscribe')
  async handleSubscribe(client: Socket, payload: { transferId: string }) {
    const transfer = await this.prisma.transferJob.findFirst({
      where: {
        id: payload.transferId,
        userId: client.data.userId,
      },
    });

    if (!transfer) {
      return;
    }

    client.join(payload.transferId);
  }

  emitProgress(
    transferId: string,
    data: {
      currentFileName?: string;
      completedFiles: number;
      totalFiles: number;
      status: string;
    },
  ) {
    this.server.to(transferId).emit('progress', data);
  }
}
