import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { BaseballSession } from './entities/baseball_session.entity';
import { DeleteResult, Repository } from 'typeorm';
import { CreateBaseballSessionInput } from './dtos/createBaseballSession.dto';
import { DeleteBaseballSessionBySocketIdInput } from './dtos/deleteBaseballSessionBySocketId.dto';

@Injectable()
export class BaseballSessionService {
  constructor(
    @InjectRepository(BaseballSession)
    private readonly baseballSessions: Repository<BaseballSession>,
  ) {}

  async createBaseballSession(
    createBaseballSessionInput: CreateBaseballSessionInput,
  ): Promise<BaseballSession> {
    const newBaseballSession = this.baseballSessions.create(
      createBaseballSessionInput,
    );
    return this.baseballSessions.save(newBaseballSession);
  }

  async deleteBaseballSessionBySocketId(
    deleteBaseballSessionBySocketIdInput: DeleteBaseballSessionBySocketIdInput,
  ): Promise<DeleteResult> {
    if (!deleteBaseballSessionBySocketIdInput.socketId) return;
    const baseballSession = await this.baseballSessions.findOne({
      where: [
        { user1: deleteBaseballSessionBySocketIdInput.socketId },
        { user2: deleteBaseballSessionBySocketIdInput.socketId },
      ],
    });
    if (!baseballSession) return;
    return await this.baseballSessions.delete(baseballSession.id);
  }
}
