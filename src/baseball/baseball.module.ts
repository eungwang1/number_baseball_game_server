import { Module } from '@nestjs/common';
import { BaseballGateway } from './baseball.gateway';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WaitingUser } from 'src/waiting_user/entities/waiting_user.entity';
import { User } from 'src/user/entities/user.entity';
import { BaseballGame } from './entities/baseball_game.entity';
import { WaitingUserService } from 'src/waiting_user/waiting_user.service';
import { BaseballGameService } from './baseball_game.service';
import { BaseballRoomGateway } from './baseball_room.gateway';

@Module({
  imports: [TypeOrmModule.forFeature([WaitingUser, User, BaseballGame])],
  providers: [
    BaseballGateway,
    WaitingUserService,
    BaseballGameService,
    BaseballRoomGateway,
  ],
})
export class BaseballModule {}
