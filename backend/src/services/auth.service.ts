import {
  AlreadyRegisteredException,
  AuthChangePasswordDTO,
  AuthLoginDTO,
  AuthSignupDTO,
  BadBodyException,
  ForbiddenException,
  LoginException,
  UnauthorizedException,
  WrongPasswordException
} from '@cloneoverflow/common';
import jwt from 'jsonwebtoken';
import config from '../config';
import { UserRepository } from '../repositories/user.repository';
import { DbUser } from '../types/database/DbUser';
import { compare, hash } from '../utils/hash';

export class AuthService {
  constructor (
    private userRepository = new UserRepository(),
  ) {}

  async login ({ email, password }: AuthLoginDTO) {
    const user = await this.userRepository.find({
      email,
    });

    if (!(user && await compare(password, user.password))) {
      throw new LoginException();
    }

    return {
      user,
      ...this.getToken(user),
    };
  }

  async signup ({ email, password, name, username, about }: AuthSignupDTO) {
    const userExists = await this.userRepository.find({
      OR: [
        { email },
        { userProfile: { username } },
      ],
    });

    if (userExists) {
      if (userExists.userProfile?.username === username) {
        throw new BadBodyException("Username already exists");
      }
      throw new AlreadyRegisteredException();
    }

    const passwordHash = await hash(password);

    const user = await this.userRepository.create({
      email,
      password: passwordHash,
      userProfile: {
        create: {
          name,
          username,
          about,
        },
      },
    });

    return {
      user,
      ...this.getToken(user),
    };
  }

  async refreshToken (refresh_token: string) {
    if (!refresh_token) {
      throw new UnauthorizedException();
    }

    try {
      const { userId } = jwt.verify(refresh_token, config.TOKEN_SECRET) as any;
      const user = await this.userRepository.findById(userId);
      return {
        access_token: this.getToken(user).access_token,
      };
    }
    catch (err) {
      throw new ForbiddenException();
    }
  }

  async changePassword (userId: string, { oldPassword, newPassword }: AuthChangePasswordDTO) {
    const user = await this.userRepository.findById(userId);
    
    if (!(user && await compare(oldPassword, user.password))) {
      throw new WrongPasswordException();
    }

    const passwordHash = await hash(newPassword);
    await this.userRepository.updateById(userId, {
      password: passwordHash,
    });
  }

  async getMe (userId: string) {
    return await this.userRepository.findById(userId);
  }

  private getToken (user: DbUser) {
    const access_token = jwt.sign(
      {
        userId: user.id,
        status: user.userProfile.status,
      }, 
      config.TOKEN_SECRET, 
      {
        expiresIn: "15m",
      },
    );

    const refresh_token = jwt.sign(
      {
        userId: user.id,
      }, 
      config.TOKEN_SECRET, 
      {
        expiresIn: "7d",
      },
    );

    return {
      access_token,
      refresh_token,
    }
  }
}