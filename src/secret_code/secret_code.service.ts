import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SecretCode } from './secret_code.entity';

@Injectable()
export class SecretCodeService {
  constructor(
    @InjectRepository(SecretCode)
    private readonly secretCodes: Repository<SecretCode>,
  ) {}

  async fillUniqueSecretCodes(): Promise<SecretCode[]> {
    const MIN_SECRET_CODE = 1000;
    const MAX_SECRET_CODE = 9999;
    const secretCodes = await this.secretCodes.find();
    const secretCodeNumbers = secretCodes.map(
      (secretCode) => secretCode.secretCode,
    );
    const secretCodeNumbersToCreate = [];
    for (let i = MIN_SECRET_CODE; i <= MAX_SECRET_CODE; i++) {
      if (!secretCodeNumbers.includes(i)) secretCodeNumbersToCreate.push(i);
    }
    const secretCodesToCreate = secretCodeNumbersToCreate.map(
      (secretCodeNumber) =>
        this.secretCodes.create({ secretCode: secretCodeNumber }),
    );
    return await this.secretCodes.save(secretCodesToCreate);
  }

  async getAndDeleteRandomSecretCode(): Promise<SecretCode | undefined> {
    const randomSecretCode = await this.secretCodes
      .createQueryBuilder('secretCode')
      .orderBy('RANDOM()')
      .limit(1)
      .getOne();
    if (randomSecretCode) {
      await this.secretCodes.delete(randomSecretCode.id);
      return randomSecretCode;
    }
  }
}
