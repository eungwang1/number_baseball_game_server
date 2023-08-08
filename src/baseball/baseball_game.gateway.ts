import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { BaseballGameService } from './baseball_game.service';
import { sample } from 'lodash';
import { EmitErrorArgs } from './baseball_game.type';

const BASEBALL_GAME_SUBSCRIBE_EVENTS = {
  SET_BALL_NUMBER: 'setBallNumber',
  GUESS_BALL_NUMBER: 'guessBallNumber',
};

const BASEBALL_GAME_EMIT_EVENTS = {
  START_GAME: 'startGame',
  CHANGE_TURN: 'changeTurn',
  ERROR: 'error',
  GUESS_RESULT: 'guessResult',
  GAME_END: 'gameEnd',
  OPPONENT_GUESS_RESULT: 'opponentGuessResult',
};

@WebSocketGateway({
  namespace: /\/baseball\/.*/,
})
export class BaseballGameGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  constructor(private readonly baseballGameService: BaseballGameService) {}

  private async getBaseballGame(socket: Socket) {
    const baseballGameId = socket.nsp.name.split('/')[2];
    const baseballGame = await this.baseballGameService.findBaseballGameById({
      id: baseballGameId,
    });
    if (!baseballGame) {
      this.emitError({
        destinaton: socket,
        message: 'Invalid room',
        statusCode: 400,
      });

      return null;
    }
    return baseballGame;
  }

  private emitError(args: EmitErrorArgs) {
    const { destinaton, message, statusCode } = args;
    destinaton.emit(BASEBALL_GAME_EMIT_EVENTS.ERROR, { message, statusCode });
  }

  private emitOpponentDisconnect(socket: Socket, baseballGame) {
    const isUser1 = baseballGame.user1 === socket.id;
    const opponentSocketId = isUser1 ? baseballGame.user2 : baseballGame.user1;
    this.emitError({
      destinaton: socket.to(opponentSocketId),
      message: 'Opponent disconnected',
      statusCode: 410,
    });
  }

  private async isValidBaseballNumber(
    baseballNumber: string,
  ): Promise<{ ok: boolean; message?: string }> {
    if (baseballNumber.length !== 4)
      return {
        ok: false,
        message: 'Number length must be 4',
      };
    const baseballNumberArray = baseballNumber.split('');
    const isNumber = baseballNumberArray.every((n) => !isNaN(parseInt(n)));
    if (!isNumber)
      return {
        ok: false,
        message: 'Number must be number',
      };
    const isUnique = new Set(baseballNumberArray).size === 4;
    if (!isUnique)
      return {
        ok: false,
        message: 'Number must be unique',
      };
    return {
      ok: true,
    };
  }

  afterInit(server: Server) {
    console.log('BaseballGameGateway Init');
  }

  async handleConnection(socket: Socket) {
    const baseballGame = await this.getBaseballGame(socket);
    if (!baseballGame) return;

    if (!baseballGame.user1) {
      this.baseballGameService.updateBaseballGame({
        id: baseballGame.id,
        user1: socket.id,
      });
    } else if (!baseballGame.user2) {
      this.baseballGameService.updateBaseballGame({
        id: baseballGame.id,
        user2: socket.id,
      });
    } else {
      this.emitError({
        destinaton: socket,
        message: 'Room is full',
        statusCode: 403,
      });
      socket.disconnect();
    }
  }

  async handleDisconnect(socket: Socket) {
    const baseballGame = await this.getBaseballGame(socket);
    if (!baseballGame) return;
    this.baseballGameService.deleteBaseballGameBySocketId({
      socketId: socket.id,
    });
    this.emitOpponentDisconnect(socket, baseballGame);
  }

  @SubscribeMessage(BASEBALL_GAME_SUBSCRIBE_EVENTS.SET_BALL_NUMBER)
  async handleSetBallNumber(
    @MessageBody() baseballNumber: string,
    @ConnectedSocket() socket: Socket,
  ) {
    const isValid = await this.isValidBaseballNumber(baseballNumber);
    if (!isValid.ok) {
      this.emitError({
        destinaton: socket,
        message: isValid.message,
        statusCode: 400,
      });
      return;
    }
    let baseballGame = await this.getBaseballGame(socket);
    if (!baseballGame) return;
    const isUser1 = baseballGame.user1 === socket.id;
    const isUser2 = baseballGame.user2 === socket.id;
    const opponentSocketId = isUser1 ? baseballGame.user2 : baseballGame.user1;
    const mySocketId = isUser1 ? baseballGame.user1 : baseballGame.user2;

    if (!isUser1 && !isUser2) {
      this.emitError({
        destinaton: socket,
        message: 'User not found in room',
        statusCode: 404,
      });

      return;
    }
    if (baseballGame.game_started) {
      this.emitError({
        destinaton: socket,
        message: 'Game already started',
        statusCode: 409,
      });

      return;
    }
    if (isUser1 && baseballGame.user1_baseball_number) {
      this.emitError({
        destinaton: socket,
        message: 'Already set your number',
        statusCode: 409,
      });

      return;
    }
    if (isUser2 && baseballGame.user2_baseball_number) {
      this.emitError({
        destinaton: socket,
        message: 'Already set your number',
        statusCode: 409,
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
      socket.emit(BASEBALL_GAME_EMIT_EVENTS.START_GAME, {
        myNumber: myBaseballNumber,
        mySocketId: mySocketId,
      });
      socket.to(opponentSocketId).emit(BASEBALL_GAME_EMIT_EVENTS.START_GAME, {
        myNumber: opponentBaseballNumber,
        mySocketId: opponentSocketId,
      });
      socket.emit(BASEBALL_GAME_EMIT_EVENTS.CHANGE_TURN, { turn: randomTurn });
      socket
        .to(opponentSocketId)
        .emit(BASEBALL_GAME_EMIT_EVENTS.CHANGE_TURN, { turn: randomTurn });
    }
  }

  @SubscribeMessage(BASEBALL_GAME_SUBSCRIBE_EVENTS.GUESS_BALL_NUMBER)
  async handleGuessBallNumber(
    @MessageBody() number: number,
    @ConnectedSocket() socket: Socket,
  ) {
    const baseballGame = await this.getBaseballGame(socket);
    if (!baseballGame) return;
    const isUser1 = baseballGame.user1 === socket.id;
    const isUser2 = baseballGame.user2 === socket.id;
    if (!isUser1 && !isUser2) {
      this.emitError({
        destinaton: socket,
        message: 'User not found in room',
        statusCode: 404,
      });
      return;
    }
    if (!baseballGame.game_started) {
      this.emitError({
        destinaton: socket,
        message: 'Game not started',
        statusCode: 409,
      });
      return;
    }
    if (baseballGame.turn !== socket.id) {
      this.emitError({
        destinaton: socket,
        message: 'Not your turn',
        statusCode: 403,
      });
      return;
    }
    const opponentNumber = isUser1
      ? baseballGame.user2_baseball_number
      : baseballGame.user1_baseball_number;
    const opponentSocketId = isUser1 ? baseballGame.user2 : baseballGame.user1;
    const opponentNumberArray = opponentNumber
      .toString()
      .split('')
      .map((n) => parseInt(n));
    const numberArray = number
      .toString()
      .split('')
      .map((n) => parseInt(n));
    const strike = numberArray.filter(
      (n, i) => n === opponentNumberArray[i],
    ).length;
    const ball =
      numberArray.filter((n) => opponentNumberArray.includes(n)).length -
      strike;
    socket.emit(BASEBALL_GAME_EMIT_EVENTS.GUESS_RESULT, { strike, ball });
    socket
      .to(opponentSocketId)
      .emit(BASEBALL_GAME_EMIT_EVENTS.OPPONENT_GUESS_RESULT, { strike, ball });
    if (strike === 4) {
      socket.emit(BASEBALL_GAME_EMIT_EVENTS.GAME_END, { isWin: true });
      socket
        .to(opponentSocketId)
        .emit(BASEBALL_GAME_EMIT_EVENTS.GAME_END, { isWin: false });
    } else {
      const turn = isUser1 ? baseballGame.user2 : baseballGame.user1;
      await this.baseballGameService.updateBaseballGame({
        id: baseballGame.id,
        turn,
      });
      socket.emit(BASEBALL_GAME_EMIT_EVENTS.CHANGE_TURN, { turn });
      socket.to(turn).emit(BASEBALL_GAME_EMIT_EVENTS.CHANGE_TURN, { turn });
    }
  }
}
