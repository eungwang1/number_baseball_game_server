import {
  ConnectedSocket,
  MessageBody,
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
import envSetup from '../config/env';
import { SecretCodeService } from 'src/secret_code/secret_code.service';

const BASEBALL_SUBSCRIBE_EVENTS = {
  REQUEST_RANDOM_MATCH: 'requestRandomMatch',
  CREATE_SECRET_MATCH: 'createSecretMatch',
  JOIN_SECRET_MATCH: 'joinSecretMatch',
  CANCEL_RANDOM_MATCH: 'cancelRandomMatch',
  APPROVE_RANDOM_MATCH: 'approveRandomMatch',
};

const BASEBALL_EMIT_EVENTS = {
  MATCHED: 'matched',
  MATCH_APPROVED: 'matchApproved',
  MATCH_CANCELED: 'matchCancelled',
  SECRET_MATCH_CREATED: 'secretMatchCreated',
  NO_USERS_AVAILABLE: 'noUsersAvailable',
  ERROR: 'error',
};

console.log(envSetup().FRONTEND_URL);
@WebSocketGateway({
  cors: {
    origin: envSetup().FRONTEND_URL,
    methods: ['GET', 'POST'],
    credentials: true,
  },
})
export class BaseballGateway implements OnGatewayDisconnect {
  private readonly logger = new Logger(BaseballGateway.name);
  constructor(
    private readonly waitingUserService: WaitingUserService,
    private readonly baseballGameService: BaseballGameService,
    private readonly secretCodeService: SecretCodeService,
  ) {}

  private getRandomNumberFromList(numbers: number[]): number {
    const randomIndex = Math.floor(Math.random() * numbers.length);
    return numbers[randomIndex];
  }

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
          message: '매칭중이 아닙니다.',
          statusCode: 400,
        });
        return;
      }
      const { matchId } = waitingUser;
      if (!matchId) {
        await this.waitingUserService.deleteWaitingUser({
          socketId: socket.id,
        });
        return;
      }
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
        message: '매칭 취소에 실패했습니다.',
        statusCode: 500,
      });
    }
  }

  @SubscribeMessage(BASEBALL_SUBSCRIBE_EVENTS.APPROVE_RANDOM_MATCH)
  async handleApproveRandomMatch(@ConnectedSocket() socket: Socket) {
    try {
      this.logger.log('approveRandomMatch');
      const waitingUser = await this.waitingUserService.findWaitingUser({
        socketId: socket.id,
      });
      const matchingUser =
        await this.waitingUserService.findWaitingUserByMatchIdExceptMe({
          mySocketId: socket.id,
          matchId: waitingUser.matchId,
        });
      if (matchingUser.isMatchApproved) {
        const baseballGame =
          await this.baseballGameService.createBaseballGame();
        const turnTimeLimit =
          waitingUser.turnTimeLimit ||
          matchingUser.turnTimeLimit ||
          this.getRandomNumberFromList([30, 60, 120]);
        socket
          .to(matchingUser.socketId)
          .emit(BASEBALL_EMIT_EVENTS.MATCH_APPROVED, {
            roomId: baseballGame.id,
            turnTimeLimit,
          });
        socket.emit(BASEBALL_EMIT_EVENTS.MATCH_APPROVED, {
          roomId: baseballGame.id,
          turnTimeLimit,
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
        message: '매칭 수락에 실패했습니다.',
        statusCode: 500,
      });
    }
  }

  @SubscribeMessage(BASEBALL_SUBSCRIBE_EVENTS.REQUEST_RANDOM_MATCH)
  async handleRequestRandomMatch(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: { turnTimeLimit: number },
  ) {
    try {
      this.logger.log('requestRandomMatch');

      await this.waitingUserService.createWaitingUser({
        socketId: socket.id,
        turnTimeLimit: data.turnTimeLimit || 0,
      });
      const waitingUsers =
        await this.waitingUserService.findWaitingUsersExceptMe({
          mySocketId: socket.id,
        });

      const validUsers = waitingUsers.filter(
        (user) =>
          (user.turnTimeLimit === data.turnTimeLimit ||
            !data.turnTimeLimit ||
            !user.turnTimeLimit) &&
          !user.secretCode &&
          socket.nsp.sockets.get(user.socketId),
      );
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
        message: '랜덤 매칭 요청에 실패했습니다.',
        statusCode: 500,
      });
    }
  }

  @SubscribeMessage(BASEBALL_SUBSCRIBE_EVENTS.CREATE_SECRET_MATCH)
  async handleCreateSecretMatch(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: { turnTimeLimit: number },
  ) {
    try {
      this.logger.log('createSecretMatch');
      const secretCode =
        await this.secretCodeService.getAndDeleteRandomSecretCode();
      if (!secretCode) {
        await this.secretCodeService.fillUniqueSecretCodes();
      }
      await this.waitingUserService.createWaitingUser({
        socketId: socket.id,
        turnTimeLimit: data.turnTimeLimit || 0,
        secretCode: secretCode.secretCode,
      });
      socket.emit(BASEBALL_EMIT_EVENTS.SECRET_MATCH_CREATED, {
        secretCode: secretCode.secretCode,
      });
    } catch (e) {
      this.logger.error(e);
      this.emitError({
        destinaton: socket,
        message: '매칭 코드 생성에 실패했습니다.',
        statusCode: 500,
      });
    }
  }

  @SubscribeMessage(BASEBALL_SUBSCRIBE_EVENTS.JOIN_SECRET_MATCH)
  async handleJoinSecretMatch(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: { secretCode: number },
  ) {
    try {
      this.logger.log('joinSecretMatch');
      if (typeof data.secretCode !== 'number') {
        this.emitError({
          destinaton: socket,
          message: '잘못된 코드입니다.',
          statusCode: 404,
        });
        return;
      }
      const waiting_user = await this.waitingUserService.findWaitingUser({
        secretCode: data.secretCode,
      });
      if (!waiting_user) {
        this.emitError({
          destinaton: socket,
          message: '잘못된 코드입니다.',
          statusCode: 404,
        });
        return;
      }
      const baseballGame = await this.baseballGameService.createBaseballGame();
      socket.emit(BASEBALL_EMIT_EVENTS.MATCH_APPROVED, {
        roomId: baseballGame.id,
        turnTimeLimit: waiting_user.turnTimeLimit,
      });
      socket
        .to(waiting_user.socketId)
        .emit(BASEBALL_EMIT_EVENTS.MATCH_APPROVED, {
          roomId: baseballGame.id,
          turnTimeLimit: waiting_user.turnTimeLimit,
        });
      if (!waiting_user) {
        this.emitError({
          destinaton: socket,
          message: '존재하지 않는 방입니다.',
          statusCode: 404,
        });
        return;
      }
    } catch (e) {
      this.logger.error(e);
      this.emitError({
        destinaton: socket,
        message: '연결 중 오류가 발생했습니다.',
        statusCode: 500,
      });
    }
  }

  handleDisconnect(socket: Socket) {
    this.logger.log('baseball disconnect');
    this.handleClearSession(socket.id);
  }
}
