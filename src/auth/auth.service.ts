import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { Response } from 'express';
import axios from 'axios';
import { User } from 'src/user/entities/user.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import { Repository } from 'typeorm';
import { UserService } from 'src/user/user.service';
import { setLoginCookie } from './auth.util';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(RefreshToken)
    private readonly refreshTokens: Repository<RefreshToken>,
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async getAccessToken(user: User) {
    const payload = { sub: user.id };
    return this.jwtService.sign(payload);
  }

  async generateRefreshToken(userId: number) {
    const payload = { sub: userId };
    const queryrunner =
      this.refreshTokens.manager.connection.createQueryRunner();
    await queryrunner.connect();
    await queryrunner.startTransaction();
    try {
      const previousRefreshToken = await queryrunner.manager.findOne(
        RefreshToken,
        {
          where: {
            user: {
              id: userId,
            },
          },
        },
      );
      if (previousRefreshToken) {
        await queryrunner.manager.delete(RefreshToken, {
          user: userId,
        });
      }
      const refreshToken = this.refreshTokens.create({
        token: this.jwtService.sign(payload, {
          expiresIn: '30d',
        }),
        expires: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
        user: {
          id: userId,
        },
      });
      await queryrunner.manager.save(refreshToken);
      await queryrunner.commitTransaction();
      return refreshToken;
    } catch (error) {
      await queryrunner.rollbackTransaction();
      throw error;
    } finally {
      await queryrunner.release();
    }
  }

  async getAccessTokenFromRefreshToken(res: Response, refreshToken: string) {
    const existingRefreshToken = await this.refreshTokens.findOne({
      where: {
        token: refreshToken,
      },
      relations: {
        user: true,
      },
    });
    if (!existingRefreshToken) {
      throw new UnauthorizedException('Invalid refresh token');
    }
    if (existingRefreshToken.expires < new Date()) {
      throw new UnauthorizedException('Expired refresh token');
    }
    const payload = { sub: existingRefreshToken.user.id };
    const newRefreshToken = await this.generateRefreshToken(
      existingRefreshToken.user.id,
    );
    setLoginCookie(res, this.jwtService.sign(payload), newRefreshToken.token);
    res.send(200);
  }

  async googleLogin(code: string, res: Response) {
    const GOOGLE_CLIENT_ID = this.configService.get('GOOGLE_CLIENT_ID');
    const GOOGLE_SECRET_KEY = this.configService.get('GOOGLE_SECRET_KEY');
    const GOOGLE_REDIRECT_URL = this.configService.get('GOOGLE_REDIRECT_URL');
    const resToToken = await axios.post(
      `https://oauth2.googleapis.com/token?code=${code}&client_id=${GOOGLE_CLIENT_ID}&client_secret=${GOOGLE_SECRET_KEY}&redirect_uri=${GOOGLE_REDIRECT_URL}&grant_type=authorization_code`,
      {},
      {
        headers: {
          'content-type': 'x-www-form-urlencoded',
        },
      },
    );
    if (!resToToken.data) {
      throw new UnauthorizedException('No data from google');
    }
    const resToUserInfo = await axios.get(
      'https://www.googleapis.com/oauth2/v2/userinfo',
      {
        headers: {
          Authorization: `Bearer ${resToToken.data.access_token}`,
          'Content-type': 'application/x-www-form-urlencoded;charset=utf-8',
        },
      },
    );
    if (!resToUserInfo.data) {
      throw new UnauthorizedException('No data from google');
    }
    const { email, picture } = resToUserInfo.data;
    let user = await this.userService.findUser({
      email,
    });
    if (!user) {
      user = await this.userService.findOrCreateUser({
        email,
        picture,
        provider: 'google',
      });
    }
    const accessToken = await this.getAccessToken(user);
    const refreshToken = await this.generateRefreshToken(user);
    setLoginCookie(res, accessToken, refreshToken.token);
    res.redirect(
      `${process.env.FRONTEND_URL}${user.username ? '' : '?authType=setInfo'}`,
    );
  }

  async logout(res: Response) {
    res.clearCookie('refreshToken', {
      domain: process.env.FRONTEND_DOMAIN,
      path: '/',
      sameSite: 'none',
      secure: true,
      httpOnly: true,
    });
    res.clearCookie('accessToken', {
      domain: process.env.FRONTEND_DOMAIN,
      path: '/',
      sameSite: 'none',
      secure: true,
      httpOnly: false,
    });
    res.sendStatus(200);
  }
}
