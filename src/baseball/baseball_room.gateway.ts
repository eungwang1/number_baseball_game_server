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

@WebSocketGateway({
  namespace: /\/baseball\/.*/,
})
export class BaseballRoomGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  constructor(private readonly baseballGameService: BaseballGameService) {}

  afterInit(server: Server) {
    console.log('BaseballRoomGateway Init');
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
      socket.emit('error', { message: 'Room is full' });
    }
  }

  handleDisconnect(socket: Socket) {
    console.log('BaseballRoomGateway Disconnect');
  }

  private async getBaseballGame(socket: Socket) {
    const baseballGameId = socket.nsp.name.split('/')[2];
    const baseballGame = await this.baseballGameService.findBaseballGameById({
      id: baseballGameId,
    });
    if (!baseballGame) {
      socket.emit('error', { message: 'Invalid room' });
      return null;
    }
    return baseballGame;
  }

  @SubscribeMessage('setBallNumber')
  async handleSetBallNumber(
    @MessageBody() number: number,
    @ConnectedSocket() socket: Socket,
  ) {
    let baseballGame = await this.getBaseballGame(socket);
    if (!baseballGame) return;
    const isUser1 = baseballGame.user1 === socket.id;
    const isUser2 = baseballGame.user2 === socket.id;
    const opponentSocketId = isUser1 ? baseballGame.user2 : baseballGame.user1;
    const mySocketId = isUser1 ? baseballGame.user1 : baseballGame.user2;

    if (!isUser1 && !isUser2) {
      socket.emit('error', { message: 'User not found in room' });
      return;
    }
    if (baseballGame.game_started) {
      socket.emit('error', { message: 'Game already started' });
      return;
    }
    if (isUser1 && baseballGame.user1_baseball_number) {
      socket.emit('error', { message: 'Already set your number' });
      return;
    }
    if (isUser2 && baseballGame.user2_baseball_number) {
      socket.emit('error', { message: 'Already set your number' });
      return;
    }
    baseballGame = await this.baseballGameService.updateBaseballGame({
      id: baseballGame.id,
      [isUser1 ? 'user1_baseball_number' : 'user2_baseball_number']: number,
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
      socket.emit('startGame', {
        myNumber: myBaseballNumber,
        mySocketId: mySocketId,
      });
      socket.to(opponentSocketId).emit('startGame', {
        myNumber: opponentBaseballNumber,
        mySocketId: opponentSocketId,
      });
      socket.emit('changeTurn', { turn: randomTurn });
      socket.to(opponentSocketId).emit('changeTurn', { turn: randomTurn });
    }
  }

  @SubscribeMessage('guessBallNumber')
  async handleGuessBallNumber(
    @MessageBody() number: number,
    @ConnectedSocket() socket: Socket,
  ) {
    const baseballGame = await this.getBaseballGame(socket);
    if (!baseballGame) return;
    const isUser1 = baseballGame.user1 === socket.id;
    const isUser2 = baseballGame.user2 === socket.id;
    if (!isUser1 && !isUser2) {
      socket.emit('error', { message: 'User not found in room' });
      return;
    }
    if (!baseballGame.game_started) {
      socket.emit('error', { message: 'Game not started' });
      return;
    }
    if (baseballGame.turn !== socket.id) {
      socket.emit('error', { message: 'Not your turn' });
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
    socket.emit('guessResult', { strike, ball });
    socket.to(opponentSocketId).emit('opponentGuessResult', { strike, ball });
    if (strike === 4) {
      socket.emit('gameEnd', { isWin: true });
      socket.to(opponentSocketId).emit('gameEnd', { isWin: false });
    } else {
      const turn = isUser1 ? baseballGame.user2 : baseballGame.user1;
      await this.baseballGameService.updateBaseballGame({
        id: baseballGame.id,
        turn,
      });
      socket.emit('changeTurn', { turn });
      socket.to(turn).emit('changeTurn', { turn });
    }
  }
}
