import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';

import { User } from '../user.entity';
import { Gym } from '../gym/gym.entity';
import { OrganizationUser } from '../organization/organization-user.entity';
import { UserGymAccess } from '../organization/user-gym-access.entity';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './jwt.strategy';
import { RolesGuard } from './roles.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      Gym,
      OrganizationUser,
      UserGymAccess,
    ]),

    PassportModule,

    JwtModule.register({
      secret:
        process.env.JWT_SECRET ||
        'novaplus-development-secret-change-me',
      signOptions: {
        expiresIn: '1d',
      },
    }),
  ],

  controllers: [
    AuthController,
  ],

  providers: [
    AuthService,
    JwtStrategy,
    RolesGuard,
  ],

  exports: [
    AuthService,
    JwtModule,
    PassportModule,
    RolesGuard,
  ],
})
export class AuthModule {}
