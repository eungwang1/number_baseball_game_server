import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { FindOptionsWhere, Repository } from 'typeorm';
import { FindUserInput } from './dtos/findUser.dto';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly users: Repository<User>,
  ) {}

  async validateUserById(id: number): Promise<User> {
    return await this.users.findOne({
      where: { id },
    });
  }

  async findUser(findUserInput: FindUserInput): Promise<User> {
    const { id, email } = findUserInput;
    const where: FindOptionsWhere<User> = {};
    if (id) where.id = id;
    if (email) where.email = email;
    return await this.users.findOne({
      where: { id },
    });
  }
}
