import {
  ConnectedSocket,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { WaitingUserService } from 'src/waiting_user/waiting_user.service';
import { BaseballGameService } from './baseball_game.service';

@WebSocketGateway()
export class BaseballGateway implements OnGatewayInit, OnGatewayDisconnect {
  private wsServer: Server;
  constructor(
    private readonly waitingUserService: WaitingUserService,
    private readonly baseballGameService: BaseballGameService,
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
      const baseballGame = await this.baseballGameService.createBaseballGame({
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
        .emit('matched', { opponent: currentUser, roomId: baseballGame.id });
      socket.emit('matched', {
        opponent: randomUser,
        roomId: baseballGame.id,
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
    this.baseballGameService.deleteBaseballGameBySocketId({
      socketId: socketId,
    });
  }
}
