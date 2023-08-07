import {
  ConnectedSocket,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { WaitingUserService } from 'src/waiting_user/waiting_user.service';
import { BaseballSessionService } from './baseball_session.service';

@WebSocketGateway()
export class BaseballGateway implements OnGatewayInit, OnGatewayDisconnect {
  private wsServer: Server;
  constructor(
    private readonly waitingUserService: WaitingUserService,
    private readonly baseballSessionService: BaseballSessionService,
  ) {}
  @SubscribeMessage('requestRandomMatch')
  async handleMessage(@ConnectedSocket() socket: Socket) {
    await this.waitingUserService.createWaitingUser({ socketId: socket.id });
    const waitingUsers = await this.waitingUserService.findWaitingUsersExceptMe(
      {
        mySocketId: socket.id,
      },
    );
    const validUsers = waitingUsers.filter((user) =>
      this.wsServer.sockets.sockets.get(user.socketId),
    );
    if (validUsers.length > 0) {
      const randomUser =
        validUsers[Math.floor(Math.random() * validUsers.length)];
      const baseballSession =
        await this.baseballSessionService.createBaseballSession({
          user1: socket.id,
          user2: randomUser.socketId,
        });
      const currentUser = await this.waitingUserService.findWaitingUser({
        socketId: socket.id,
      });
      await this.waitingUserService.removeWaitingUsers({
        watingUsers: [currentUser, randomUser],
      });

      socket
        .to(randomUser.socketId)
        .emit('matched', { opponent: currentUser, roomId: baseballSession.id });
      socket.emit('matched', {
        opponent: randomUser,
        roomId: baseballSession.id,
      });
    } else {
      socket.emit('noUsersAvailable');
    }
  }

  afterInit(server: Server) {
    this.wsServer = server;
  }

  handleDisconnect(socket: Socket) {
    this.handleClearSession(socket.id);
  }

  private handleClearSession(socketId: string) {
    this.waitingUserService.deleteWaitingUser({ socketId: socketId });
    this.baseballSessionService.deleteBaseballSessionBySocketId({
      socketId: socketId,
    });
  }
}
