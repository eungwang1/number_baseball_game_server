import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeleteResult, FindOptionsWhere, Not, Repository } from 'typeorm';
import { WaitingUser } from './entities/waiting_user.entity';
import { FindWaitingUserInput } from './dtos/findWaitingUser.dto';
import { FindWaitingUsersExceptMeInput } from './dtos/findWaitingUsersExceptMe';
import { RemoveWaitingUsersInput } from './dtos/removeWaitingUsers.dto';
import { CreateWaitingUserInput } from './dtos/createWaitingUser.dto';
import { DeleteWaitingUserInput } from './dtos/deleteWaitingUser.dto';
import { UpdateWaitingUserInput } from './dtos/updateWaitingUser.dto';
import { FindWaitingUserByMatchIdExceptMeInput } from './dtos/findWaitingUserExceptMe.dto';
import { FindWatingUsersInput } from './dtos/findWatingUsers.dto';

@Injectable()
export class WaitingUserService {
  constructor(
    @InjectRepository(WaitingUser)
    private readonly waitingUsers: Repository<WaitingUser>,
  ) {}

  async createWaitingUser(
    createWaitingUserInput: CreateWaitingUserInput,
  ): Promise<WaitingUser> {
    const existingWaitingUser = await this.waitingUsers.findOne({
      where: { socketId: createWaitingUserInput.socketId },
    });
    if (existingWaitingUser) {
      return existingWaitingUser;
    }
    return this.waitingUsers.save(
      this.waitingUsers.create(createWaitingUserInput),
    );
  }

  async findWaitingUser(
    findWaitingUserInput: FindWaitingUserInput,
  ): Promise<WaitingUser> {
    const { socketId, matchId, secretCode } = findWaitingUserInput;
    const where: FindOptionsWhere<WaitingUser> = {};
    if (socketId) where.socketId = socketId;
    if (matchId) where.matchId = matchId;
    if (secretCode) where.secretCode = secretCode;
    return await this.waitingUsers.findOne({
      where,
    });
  }

  async findWatingUsers(
    findWatingUsersInput: FindWatingUsersInput,
  ): Promise<WaitingUser[]> {
    const { matchId } = findWatingUsersInput;
    const where: FindOptionsWhere<WaitingUser> = {};
    if (matchId) where.matchId = matchId;
    return await this.waitingUsers.find({
      where,
    });
  }

  async findWaitingUserByMatchIdExceptMe(
    findWaitingUserByMatchIdExceptMeInput: FindWaitingUserByMatchIdExceptMeInput,
  ): Promise<WaitingUser> {
    const { matchId, mySocketId } = findWaitingUserByMatchIdExceptMeInput;
    return await this.waitingUsers.findOne({
      where: { socketId: Not(mySocketId), matchId },
    });
  }

  async findWaitingUsersExceptMe(
    findWaitingUsersExceptMeInput: FindWaitingUsersExceptMeInput,
  ): Promise<WaitingUser[]> {
    return await this.waitingUsers.find({
      where: { socketId: Not(findWaitingUsersExceptMeInput.mySocketId) },
    });
  }

  async updateWaitingUser(
    updateWaitingUserInput: UpdateWaitingUserInput,
  ): Promise<WaitingUser> {
    const { socketId, matchId, isMatchApproved } = updateWaitingUserInput;
    const waitingUser = await this.waitingUsers.findOne({
      where: {
        socketId,
      },
    });
    if (!waitingUser) throw new Error('WaitingUser not found');
    if (matchId) waitingUser.matchId = matchId;
    if (isMatchApproved) waitingUser.isMatchApproved = isMatchApproved;
    return await this.waitingUsers.save(waitingUser);
  }

  async deleteWaitingUser(
    deleteWaitingUserInput: DeleteWaitingUserInput,
  ): Promise<DeleteResult> {
    return await this.waitingUsers.delete({
      socketId: deleteWaitingUserInput.socketId,
    });
  }

  async removeWaitingUsers(
    removeWaitingUsersInput: RemoveWaitingUsersInput,
  ): Promise<WaitingUser[]> {
    return this.waitingUsers.remove(removeWaitingUsersInput.watingUsers);
  }
}
