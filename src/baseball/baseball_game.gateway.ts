import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
} from '@nestjs/websockets';
import { Socket } from 'socket.io';
import { BaseballGameService } from './baseball_game.service';
import { sample } from 'lodash';
import { EmitErrorArgs } from './baseball_game.type';
import { BaseballGame } from './entities/baseball_game.entity';
import { Logger } from '@nestjs/common';
import { UpdateBaseballGameInput } from './dtos/updateBaseballGame.dto';

const BASEBALL_GAME_SUBSCRIBE_EVENTS = {
  SET_BALL_NUMBER: 'setBallNumber',
  GUESS_BALL_NUMBER: 'guessBallNumber',
};

const BASEBALL_GAME_EMIT_EVENTS = {
  GAME_START: 'gameStart',
  CHANGE_TURN: 'changeTurn',
  MY_BALL_REGISTERED: 'myBallRegistered',
  ERROR: 'error',
  GUESS_RESULT: 'guessResult',
  GAME_END: 'gameEnd',
  OPPONENT_GUESS_RESULT: 'opponentGuessResult',
  CONNECTED: 'connected',
};

@WebSocketGateway({
  namespace: /\/baseball\/[^\/]*$/,
})
export class BaseballGameGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(BaseballGameGateway.name);
  constructor(private readonly baseballGameService: BaseballGameService) {}
  private async getBaseballGame(socket: Socket) {
    const baseballGameId = socket.nsp.name.split('/')[2];
    const baseballGame = await this.baseballGameService.findBaseballGameById({
      id: baseballGameId,
    });
    if (!baseballGame) {
      this.emitError({
        destinaton: socket,
        message: '존재하지 않는 게임입니다.\n잠시 후 대기실로 이동합니다.',
        redirectPath: '/',
        statusCode: 404,
      });

      return null;
    }
    return baseballGame;
  }

  private emitError(args: EmitErrorArgs) {
    const { destinaton, message, statusCode, redirectPath } = args;
    destinaton.emit(BASEBALL_GAME_EMIT_EVENTS.ERROR, {
      message,
      statusCode,
      redirectPath,
    });
  }

  private async emitOpponentDisconnect(
    socket: Socket,
    baseballGame: BaseballGame,
  ) {
    const isUser1 = baseballGame.user1 === socket.id;
    const opponentSocketId = isUser1 ? baseballGame.user2 : baseballGame.user1;
    await this.baseballGameService.updateBaseballGame({
      id: baseballGame.id,
      game_finished: true,
      [`user${isUser1 ? 1 : 2}_win`]: true,
    });
    this.emitError({
      destinaton: socket.to(opponentSocketId),
      message: '상대방이 나갔습니다.\n부전승 처리됩니다.',
      redirectPath: `/baseball/${baseballGame.id}/result?result=win`,
      statusCode: 404,
    });
  }

  private isValidBaseballNumber(baseballNumber: string): {
    ok: boolean;
    message?: string;
  } {
    if (baseballNumber.length !== 4)
      return {
        ok: false,
        message: '4자리 숫자를 입력해야 합니다.',
      };
    const baseballNumberArray = baseballNumber.split('');
    const isNumber = baseballNumberArray.every((n) => !isNaN(parseInt(n)));
    if (!isNumber)
      return {
        ok: false,
        message: '숫자만 입력해야 합니다.',
      };
    const isUnique = new Set(baseballNumberArray).size === 4;
    if (!isUnique)
      return {
        ok: false,
        message: '숫자는 중복되지 않아야 합니다.',
      };
    return {
      ok: true,
    };
  }

  async handleConnection(socket: Socket) {
    try {
      this.logger.log('baseball game connection');
      const socketIds = Array.from(socket.nsp.sockets.keys());

      if (socketIds.length === 2) {
        const baseballGame = await this.getBaseballGame(socket);
        if (!baseballGame) {
          this.emitError({
            destinaton: socket,
            message: '존재하지 않는 게임입니다.\n잠시 후 대기실로 이동합니다.',
            redirectPath: '/',
            statusCode: 404,
          });
        }
        this.baseballGameService.updateBaseballGame({
          id: baseballGame.id,
          user1: socketIds[0],
          user2: socketIds[1],
        });
      }
      if (socketIds.length > 2) {
        this.emitError({
          destinaton: socket,
          message: '인원이 초과되었습니다.\n잠시 후 대기실로 이동합니다.',
          statusCode: 403,
          redirectPath: '/',
        });
      }
      socket.emit(BASEBALL_GAME_EMIT_EVENTS.CONNECTED);
    } catch (e) {
      this.logger.error(e);
      this.emitError({
        destinaton: socket,
        message: '알 수 없는 에러가 발생했습니다.',
        statusCode: 500,
        redirectPath: '/',
      });
    }
  }

  async handleDisconnect(socket: Socket) {
    try {
      this.logger.log('baseball game disconnect');
      const baseballGame = await this.getBaseballGame(socket);
      if (!baseballGame || baseballGame.game_finished) return;
      this.emitOpponentDisconnect(socket, baseballGame);
    } catch (e) {
      this.logger.error(e);
      this.emitError({
        destinaton: socket,
        message: '알 수 없는 에러가 발생했습니다.',
        statusCode: 500,
        redirectPath: '/',
      });
    }
  }

  @SubscribeMessage(BASEBALL_GAME_SUBSCRIBE_EVENTS.SET_BALL_NUMBER)
  async handleSetBallNumber(
    @MessageBody() body: { baseballNumber: string },
    @ConnectedSocket() socket: Socket,
  ) {
    try {
      if (!body.baseballNumber) {
        this.emitError({
          destinaton: socket,
          message: '숫자는 필수입니다.',
          statusCode: 400,
        });
        return;
      }
      const { baseballNumber } = body;
      const isValid = this.isValidBaseballNumber(baseballNumber);
      if (!isValid.ok) {
        return;
      }
      let baseballGame = await this.getBaseballGame(socket);
      if (!baseballGame) return;
      const isUser1 = baseballGame.user1 === socket.id;
      const isUser2 = baseballGame.user2 === socket.id;
      const opponentSocketId = isUser1
        ? baseballGame.user2
        : baseballGame.user1;
      const mySocketId = isUser1 ? baseballGame.user1 : baseballGame.user2;
      if (!isUser1 && !isUser2) {
        this.emitError({
          destinaton: socket,
          message:
            '게임에 참여중인 유저가 아닙니다.\n잠시 후 대기실로 이동합니다.',
          redirectPath: '/',
          statusCode: 404,
        });
        return;
      }
      if (isUser1 && baseballGame.user1_baseball_number) {
        this.emitError({
          destinaton: socket,
          message: '이미 숫자를 등록하셨습니다.',
          statusCode: 400,
        });

        return;
      }
      if (isUser2 && baseballGame.user2_baseball_number) {
        this.emitError({
          destinaton: socket,
          message: '이미 숫자를 등록하셨습니다.',
          statusCode: 400,
        });
        return;
      }
      baseballGame = await this.baseballGameService.updateBaseballGame({
        id: baseballGame.id,
        [isUser1 ? 'user1_baseball_number' : 'user2_baseball_number']:
          baseballNumber,
      });
      const myBaseballNumber = isUser1
        ? baseballGame.user1_baseball_number
        : baseballGame.user2_baseball_number;
      const opponentBaseballNumber = isUser1
        ? baseballGame.user2_baseball_number
        : baseballGame.user1_baseball_number;
      if (
        baseballGame.user1_baseball_number &&
        baseballGame.user2_baseball_number
      ) {
        const randomTurn = sample([baseballGame.user1, baseballGame.user2]);

        await this.baseballGameService.updateBaseballGame({
          id: baseballGame.id,
          turn: randomTurn,
          game_started: true,
        });
        socket.emit(BASEBALL_GAME_EMIT_EVENTS.GAME_START, {
          myNumber: myBaseballNumber,
          mySocketId: mySocketId,
        });
        socket.to(opponentSocketId).emit(BASEBALL_GAME_EMIT_EVENTS.GAME_START, {
          myNumber: opponentBaseballNumber,
          mySocketId: opponentSocketId,
        });
        socket.emit(BASEBALL_GAME_EMIT_EVENTS.CHANGE_TURN, {
          turn: randomTurn,
        });
        socket
          .to(opponentSocketId)
          .emit(BASEBALL_GAME_EMIT_EVENTS.CHANGE_TURN, { turn: randomTurn });
      } else {
        socket.emit(BASEBALL_GAME_EMIT_EVENTS.MY_BALL_REGISTERED);
      }
    } catch (e) {
      this.logger.error(e);
      this.emitError({
        destinaton: socket,
        message: '알 수 없는 에러가 발생했습니다.',
        statusCode: 500,
        redirectPath: '/',
      });
    }
  }

  @SubscribeMessage(BASEBALL_GAME_SUBSCRIBE_EVENTS.GUESS_BALL_NUMBER)
  async handleGuessBallNumber(
    @MessageBody() body: { baseballNumber: number },
    @ConnectedSocket() socket: Socket,
  ) {
    try {
      const { baseballNumber } = body;
      const isValid = this.isValidBaseballNumber(baseballNumber.toString());
      if (!isValid.ok) {
        this.emitError({
          destinaton: socket,
          message: isValid.message,
          statusCode: 400,
        });
        return;
      }
      const baseballGame = await this.getBaseballGame(socket);
      if (!baseballGame) return;
      const isUser1 = baseballGame.user1 === socket.id;
      const isUser2 = baseballGame.user2 === socket.id;
      if (!isUser1 && !isUser2) {
        this.emitError({
          destinaton: socket,
          message:
            '게임에 참여중인 유저가 아닙니다.\n잠시 후 대기실로 이동합니다.',
          redirectPath: '/',
          statusCode: 404,
        });
        return;
      }
      if (!baseballGame.game_started) {
        this.emitError({
          destinaton: socket,
          message: '게임이 아직 시작되지 않았습니다.',
          statusCode: 400,
        });
        return;
      }
      if (baseballGame.turn !== socket.id) {
        this.emitError({
          destinaton: socket,
          message: '당신의 차례가 아닙니다.',
          statusCode: 400,
        });
        return;
      }
      const opponentNumber = isUser1
        ? baseballGame.user2_baseball_number
        : baseballGame.user1_baseball_number;
      const opponentSocketId = isUser1
        ? baseballGame.user2
        : baseballGame.user1;

      const opponentNumberArray = opponentNumber
        .toString()
        .split('')
        .map((n) => parseInt(n));
      const numberArray = baseballNumber
        .toString()
        .split('')
        .map((n) => parseInt(n));
      const strike = numberArray.filter(
        (n, i) => n === opponentNumberArray[i],
      ).length;
      const ball =
        numberArray.filter((n) => opponentNumberArray.includes(n)).length -
        strike;

      const guessResult = {
        strike,
        ball,
        baseball_number: baseballNumber,
      };
      socket.emit(BASEBALL_GAME_EMIT_EVENTS.GUESS_RESULT, guessResult);
      socket
        .to(opponentSocketId)
        .emit(BASEBALL_GAME_EMIT_EVENTS.OPPONENT_GUESS_RESULT, guessResult);
      const currentHistory = isUser1
        ? 'user1_baseball_number_history'
        : 'user2_baseball_number_history';

      const updateBaseballGameInput: UpdateBaseballGameInput = {
        id: baseballGame.id,
        [currentHistory]: [guessResult, ...baseballGame[currentHistory]],
      };
      if (strike === 4) {
        socket.emit(BASEBALL_GAME_EMIT_EVENTS.GAME_END, { isWin: true });
        socket
          .to(opponentSocketId)
          .emit(BASEBALL_GAME_EMIT_EVENTS.GAME_END, { isWin: false });
        updateBaseballGameInput.game_finished = true;
        updateBaseballGameInput[isUser1 ? 'user1_win' : 'user2_win'] = true;
      } else {
        const turn = isUser1 ? baseballGame.user2 : baseballGame.user1;
        socket.emit(BASEBALL_GAME_EMIT_EVENTS.CHANGE_TURN, { turn });
        socket.to(turn).emit(BASEBALL_GAME_EMIT_EVENTS.CHANGE_TURN, { turn });
        updateBaseballGameInput.turn = turn;
      }

      await this.baseballGameService.updateBaseballGame(
        updateBaseballGameInput,
      );
    } catch (e) {
      this.logger.error(e);
      this.emitError({
        destinaton: socket,
        message: '알 수 없는 에러가 발생했습니다.',
        statusCode: 500,
        redirectPath: '/',
      });
    }
  }
}
