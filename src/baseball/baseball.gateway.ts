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

const BASEBALL_SUBSCRIBE_EVENTS = {
  REQUEST_RANDOM_MATCH: 'requestRandomMatch',
  CANCEL_RANDOM_MATCH: 'cancelRandomMatch',
};

const BASEBALL_EMIT_EVENTS = {
  MATCHED: 'matched',
  NO_USERS_AVAILABLE: 'noUsersAvailable',
};
@WebSocketGateway({
  cors: {
    origin:
      process.env.NODE_ENV === 'production' ? process.env.FRONTEND_URL : '*',
    methods: ['GET', 'POST'],
    credentials: true,
  },
})
export class BaseballGateway implements OnGatewayInit, OnGatewayDisconnect {
  private wsServer: Server;
  constructor(
    private readonly waitingUserService: WaitingUserService,
    private readonly baseballGameService: BaseballGameService,
  ) {}

  @SubscribeMessage(BASEBALL_SUBSCRIBE_EVENTS.CANCEL_RANDOM_MATCH)
  async handleCancelRandomMatch(@ConnectedSocket() socket: Socket) {
    await this.waitingUserService.deleteWaitingUser({ socketId: socket.id });
  }

  @SubscribeMessage(BASEBALL_SUBSCRIBE_EVENTS.REQUEST_RANDOM_MATCH)
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
      const baseballGame = await this.baseballGameService.createBaseballGame();
      const currentUser = await this.waitingUserService.findWaitingUser({
        socketId: socket.id,
      });
      await this.waitingUserService.removeWaitingUsers({
        watingUsers: [currentUser, randomUser],
      });

      socket.to(randomUser.socketId).emit(BASEBALL_EMIT_EVENTS.MATCHED, {
        opponent: currentUser,
        me: randomUser,
        roomId: baseballGame.id,
      });
      socket.emit(BASEBALL_EMIT_EVENTS.MATCHED, {
        opponent: randomUser,
        me: currentUser,
        roomId: baseballGame.id,
      });
    } else {
      socket.emit(BASEBALL_EMIT_EVENTS.NO_USERS_AVAILABLE);
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
