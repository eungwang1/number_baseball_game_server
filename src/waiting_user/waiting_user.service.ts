import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeleteResult, Not, Repository } from 'typeorm';
import { WaitingUser } from './entities/waiting_user.entity';
import { FindWaitingUserInput } from './dtos/findWaitingUser.dto';
import { FindWaitingUsersExceptMeInput } from './dtos/findWaitingUsersExceptMe';
import { RemoveWaitingUsersInput } from './dtos/removeWaitingUsers.dto';
import { CreateWaitingUserInput } from './dtos/createWaitingUser.dto';
import { DeleteWaitingUserInput } from './dtos/deleteWaitingUser.dto';

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
    return await this.waitingUsers.findOne({
      where: { socketId: findWaitingUserInput.socketId },
    });
  }

  async findWaitingUsersExceptMe(
    findWaitingUsersExceptMeInput: FindWaitingUsersExceptMeInput,
  ): Promise<WaitingUser[]> {
    return await this.waitingUsers.find({
      where: { socketId: Not(findWaitingUsersExceptMeInput.mySocketId) },
    });
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
