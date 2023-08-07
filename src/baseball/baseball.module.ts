import { Module } from '@nestjs/common';
import { BaseballGateway } from './baseball.gateway';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WaitingUser } from 'src/waiting_user/entities/waiting_user.entity';
import { User } from 'src/user/entities/user.entity';
import { BaseballSession } from './entities/baseball_session.entity';
import { WaitingUserService } from 'src/waiting_user/waiting_user.service';
import { BaseballSessionService } from './baseball_session.service';
import { BaseballRoomGateway } from './baseball_room.gateway';

@Module({
  imports: [TypeOrmModule.forFeature([WaitingUser, User, BaseballSession])],
  providers: [
    BaseballGateway,
    WaitingUserService,
    BaseballSessionService,
    BaseballRoomGateway,
  ],
})
export class BaseballModule {}
