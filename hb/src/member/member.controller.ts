import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../user.entity';

import { MemberService } from './member.service';

@Controller('members')
@UseGuards(
  JwtAuthGuard,
  RolesGuard,
)
@Roles(
  UserRole.GYM_ADMIN,
  UserRole.STAFF,
)
export class MemberController {
  constructor(
    private readonly memberService:
      MemberService,
  ) {}

  @Get()
  findAll(
    @Req() req: any,
    @Query('page') page = '1',
    @Query('pageSize') pageSize = '100',
    @Query('search') search = '',
    @Query('status') status = 'all',
  ) {
    return this.memberService.findPageByGym(
      req.user.gymId,
      {
        page: Number(page),
        pageSize: Number(pageSize),
        search,
        status,
      },
    );
  }

  @Post()
  create(
    @Body() body: any,
    @Req() req: any,
  ) {
    return this.memberService.createForGym(
      req.user.gymId,
      body,
    );
  }

  @Put(':id')
  update(
    @Param('id') id: string,
    @Body() body: any,
    @Req() req: any,
  ) {
    return this.memberService.updateMemberForGym(
      req.user.gymId,
      Number(id),
      body,
    );
  }

  @Post(':id/renew')
  renew(
    @Param('id') id: string,
    @Req() req: any,
  ) {
    return this.memberService.renewMembershipForGym(
      req.user.gymId,
      Number(id),
    );
  }

  @Delete(':id')
  delete(
    @Param('id') id: string,
    @Req() req: any,
  ) {
    return this.memberService.deleteMemberForGym(
      req.user.gymId,
      Number(id),
    );
  }
}
