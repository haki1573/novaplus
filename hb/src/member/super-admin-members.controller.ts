import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
} from '@nestjs/common';

import { MemberService } from './member.service';

@Controller(
  'super-admin/gyms/:gymId/members',
)
export class SuperAdminMembersController {
  constructor(
    private readonly memberService: MemberService,
  ) {}

  @Get()
  async findAll(
    @Param('gymId') gymId: string,
  ) {
    return this.memberService.findAllByGym(
      gymId,
    );
  }

  @Post()
  async create(
    @Param('gymId') gymId: string,
    @Body() body: any,
  ) {
    return this.memberService.createForGym(
      gymId,
      body,
    );
  }

  @Put(':id')
  async update(
    @Param('gymId') gymId: string,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    return this.memberService.updateMemberForGym(
      gymId,
      Number(id),
      body,
    );
  }

  @Post(':id/renew')
  async renew(
    @Param('gymId') gymId: string,
    @Param('id') id: string,
  ) {
    return this.memberService.renewMembershipForGym(
      gymId,
      Number(id),
    );
  }

  @Delete(':id')
  async delete(
    @Param('gymId') gymId: string,
    @Param('id') id: string,
  ) {
    return this.memberService.deleteMemberForGym(
      gymId,
      Number(id),
    );
  }
}
