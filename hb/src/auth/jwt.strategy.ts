import {
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

import {
  InjectRepository,
} from '@nestjs/typeorm';

import {
  Repository,
} from 'typeorm';

import {
  PassportStrategy,
} from '@nestjs/passport';

import {
  ExtractJwt,
  Strategy,
} from 'passport-jwt';

import {
  User,
} from '../user.entity';

@Injectable()
export class JwtStrategy
  extends PassportStrategy(
    Strategy,
  )
{
  constructor(
    @InjectRepository(User)
    private readonly userRepository:
      Repository<User>,
  ) {
    super({
      jwtFromRequest:
        ExtractJwt
          .fromAuthHeaderAsBearerToken(),
      secretOrKey:
        process.env.JWT_SECRET ||
        'novaplus-development-secret-change-me',
    });
  }

  async validate(
    payload: any,
  ) {
    const userId =
      payload.id ||
      payload.sub;

    if (!userId) {
      throw new UnauthorizedException(
        'Geçersiz oturum.',
      );
    }

    const user =
      await this.userRepository.findOne({
        where: {
          id: userId,
        },
      });

    if (
      !user ||
      !user.isActive
    ) {
      throw new UnauthorizedException(
        'Kullanıcı hesabı pasif veya bulunamadı.',
      );
    }

    if (
      Number(
        payload.tokenVersion ||
          0,
      ) !==
      Number(
        user.tokenVersion ||
          0,
      )
    ) {
      throw new UnauthorizedException(
        'Oturum geçersiz kılındı. Tekrar giriş yapın.',
      );
    }

    return {
      ...payload,
      id: user.id,
      sub: user.id,
      email: user.email,
      role: user.role,
      gymId: user.gymId,
    };
  }
}
