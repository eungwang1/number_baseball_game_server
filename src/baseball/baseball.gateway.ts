import {
  ConnectedSocket,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
} from '@nestjs/websockets';
import { Socket } from 'socket.io';
import { WaitingUserService } from 'src/waiting_user/waiting_user.service';
import { BaseballGameService } from './baseball_game.service';
import { EmitErrorArgs } from './baseball_game.type';
import { Logger } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';

const BASEBALL_SUBSCRIBE_EVENTS = {
  REQUEST_RANDOM_MATCH: 'requestRandomMatch',
  CANCEL_RANDOM_MATCH: 'cancelRandomMatch',
  APPROVE_RANDOM_MATCH: 'approveRandomMatch',
};

const BASEBALL_EMIT_EVENTS = {
  MATCHED: 'matched',
  MATCH_APPROVED: 'matchApproved',
  MATCH_CANCELED: 'matchCancelled',
  NO_USERS_AVAILABLE: 'noUsersAvailable',
  ERROR: 'error',
};
@WebSocketGateway({
  cors: {
    origin:
      process.env.NODE_ENV === 'production' ? process.env.FRONTEND_URL : '*',
    methods: ['GET', 'POST'],
    credentials: true,
  },
})
export class BaseballGateway implements OnGatewayDisconnect {
  private readonly logger = new Logger(BaseballGateway.name);
  constructor(
    private readonly waitingUserService: WaitingUserService,
    private readonly baseballGameService: BaseballGameService,
  ) {}

  private emitError(args: EmitErrorArgs) {
    const { destinaton, message, statusCode } = args;
    destinaton.emit(BASEBALL_EMIT_EVENTS.ERROR, { message, statusCode });
  }

  private handleClearSession(socketId: string) {
    this.waitingUserService.deleteWaitingUser({ socketId: socketId });
  }

  @SubscribeMessage(BASEBALL_SUBSCRIBE_EVENTS.CANCEL_RANDOM_MATCH)
  async handleCancelRandomMatch(@ConnectedSocket() socket: Socket) {
    try {
      this.logger.log('cancelRandomMatch');
      const waitingUser = await this.waitingUserService.findWaitingUser({
        socketId: socket.id,
      });
      if (!waitingUser) {
        this.emitError({
          destinaton: socket,
          message: 'You are not waiting for a match',
          statusCode: 400,
        });
        return;
      }
      const { matchId } = waitingUser;
      const matchingUsers = await this.waitingUserService.findWatingUsers({
        matchId,
      });
      if (matchingUsers.length !== 2) {
        await this.waitingUserService.removeWaitingUsers({
          watingUsers: matchingUsers,
        });
        return;
      }
      const matchingUser = matchingUsers.find(
        (user) => user.socketId !== socket.id,
      );
      socket
        .to(matchingUser.socketId)
        .emit(BASEBALL_EMIT_EVENTS.MATCH_CANCELED);
      await this.waitingUserService.removeWaitingUsers({
        watingUsers: matchingUsers,
      });
    } catch (e) {
      this.logger.error(e);
      this.emitError({
        destinaton: socket,
        message: 'Something went wrong',
        statusCode: 500,
      });
    }
  }

  @SubscribeMessage(BASEBALL_SUBSCRIBE_EVENTS.APPROVE_RANDOM_MATCH)
  async handleApproveRandomMatch(@ConnectedSocket() socket: Socket) {
    try {
      this.logger.log('approveRandomMatch');
      console.log(socket.id);
      const waitingUser = await this.waitingUserService.findWaitingUser({
        socketId: socket.id,
      });
      const matchingUser =
        await this.waitingUserService.findWaitingUserByMatchIdExceptMe({
          mySocketId: socket.id,
          matchId: waitingUser.matchId,
        });
      console.log(matchingUser);
      console.log(matchingUser.isMatchApproved);
      if (matchingUser.isMatchApproved) {
        const baseballGame =
          await this.baseballGameService.createBaseballGame();
        socket
          .to(matchingUser.socketId)
          .emit(BASEBALL_EMIT_EVENTS.MATCH_APPROVED, {
            roomId: baseballGame.id,
          });
        socket.emit(BASEBALL_EMIT_EVENTS.MATCH_APPROVED, {
          roomId: baseballGame.id,
        });
      }
      if (!matchingUser.isMatchApproved) {
        await this.waitingUserService.updateWaitingUser({
          socketId: socket.id,
          isMatchApproved: true,
        });
      }
    } catch (e) {
      this.logger.error(e);
      this.emitError({
        destinaton: socket,
        message: 'Something went wrong',
        statusCode: 500,
      });
    }
  }

  @SubscribeMessage(BASEBALL_SUBSCRIBE_EVENTS.REQUEST_RANDOM_MATCH)
  async handleMessage(@ConnectedSocket() socket: Socket) {
    try {
      this.logger.log('requestRandomMatch');
      await this.waitingUserService.createWaitingUser({ socketId: socket.id });
      const waitingUsers =
        await this.waitingUserService.findWaitingUsersExceptMe({
          mySocketId: socket.id,
        });
      const validUsers = waitingUsers.filter((user) => {
        return socket.nsp.sockets.get(user.socketId);
      });
      if (validUsers.length > 0) {
        const matchId = uuidv4();

        const opponent =
          validUsers[Math.floor(Math.random() * validUsers.length)];
        const me = await this.waitingUserService.findWaitingUser({
          socketId: socket.id,
        });
        await this.waitingUserService.updateWaitingUser({
          socketId: opponent.socketId,
          matchId: matchId,
        });
        await this.waitingUserService.updateWaitingUser({
          socketId: socket.id,
          matchId: matchId,
        });

        socket.to(opponent.socketId).emit(BASEBALL_EMIT_EVENTS.MATCHED, {
          opponent: me,
          me: opponent,
          matchId: matchId,
        });
        socket.emit(BASEBALL_EMIT_EVENTS.MATCHED, {
          opponent: opponent,
          me: me,
          matchId: matchId,
        });
      } else {
        socket.emit(BASEBALL_EMIT_EVENTS.NO_USERS_AVAILABLE);
      }
    } catch (e) {
      this.logger.error(e);
      this.emitError({
        destinaton: socket,
        message: 'Something went wrong',
        statusCode: 500,
      });
    }
  }

  handleDisconnect(socket: Socket) {
    this.logger.log('baseball disconnect');
    this.handleClearSession(socket.id);
  }
}
