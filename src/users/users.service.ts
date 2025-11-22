import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async create(
    email: string,
    organizationId: string,
    password?: string,
  ): Promise<User> {
    const user = this.usersRepository.create({
      email,
      organizationId,
      passwordHash: password ? await bcrypt.hash(password, 10) : null,
    });
    return this.usersRepository.save(user);
  }

  async saveMagicLinkToken(
    user: User,
    token: string,
    expiresAt: Date,
  ): Promise<void> {
    user.magicLinkToken = token;
    user.magicLinkExpiresAt = expiresAt;
    await this.usersRepository.save(user);
  }

  async findByMagicLinkToken(token: string): Promise<User | null> {
    return this.usersRepository.findOne({
      where: { magicLinkToken: token },
    });
  }

  async clearMagicLinkToken(user: User): Promise<void> {
    user.magicLinkToken = null;
    user.magicLinkExpiresAt = null;
    await this.usersRepository.save(user);
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { email } });
  }

  async findById(id: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { id } });
  }

  async validatePassword(user: User, password: string): Promise<boolean> {
    return bcrypt.compare(password, user.passwordHash);
  }
}

