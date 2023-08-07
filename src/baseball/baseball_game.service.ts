import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { BaseballGame } from './entities/baseball_game.entity';
import { DeleteResult, Repository } from 'typeorm';
import { CreateBaseballGameInput } from './dtos/createBaseballGame.dto';
import { DeleteBaseballGameBySocketIdInput } from './dtos/deleteBaseballGameBySocketId.dto';
import { FindBaseballGameByIdInput } from './dtos/findBaseballGameById.dto';
import { UpdateBaseballGameInput } from './dtos/updateBaseballGame.dto';

@Injectable()
export class BaseballGameService {
  constructor(
    @InjectRepository(BaseballGame)
    private readonly baseballGames: Repository<BaseballGame>,
  ) {}

  async createBaseballGame(
    createBaseballGameInput?: CreateBaseballGameInput,
  ): Promise<BaseballGame> {
    const newBaseballGame = this.baseballGames.create(createBaseballGameInput);
    return this.baseballGames.save(newBaseballGame);
  }

  async findBaseballGameById(
    findBaseballGameByIdInput: FindBaseballGameByIdInput,
  ): Promise<BaseballGame> {
    return this.baseballGames.findOne({
      where: { id: findBaseballGameByIdInput.id },
    });
  }

  async updateBaseballGame(
    updateBaseballGameInput: UpdateBaseballGameInput,
  ): Promise<BaseballGame> {
    const { id, ...rest } = updateBaseballGameInput;
    const baseballGame = await this.baseballGames.findOne({ where: { id } });
    if (!baseballGame) return;
    Object.assign(baseballGame, rest);
    return this.baseballGames.save(baseballGame);
  }

  async deleteBaseballGameBySocketId(
    deleteBaseballGameBySocketIdInput: DeleteBaseballGameBySocketIdInput,
  ): Promise<DeleteResult> {
    if (!deleteBaseballGameBySocketIdInput.socketId) return;
    const baseballSession = await this.baseballGames.findOne({
      where: [
        { user1: deleteBaseballGameBySocketIdInput.socketId },
        { user2: deleteBaseballGameBySocketIdInput.socketId },
      ],
    });
    if (!baseballSession) return;
    return await this.baseballGames.delete(baseballSession.id);
  }
}
