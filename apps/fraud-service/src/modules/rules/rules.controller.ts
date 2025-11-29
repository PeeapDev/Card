import { Controller, Get, Post, Put, Delete, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { RulesService } from './rules.service';

@ApiTags('Rules')
@Controller('rules')
export class RulesController {
  constructor(private readonly rulesService: RulesService) {}

  @Get()
  @ApiOperation({ summary: 'Get all fraud rules' })
  async getAllRules() {
    return this.rulesService.getAllRules();
  }

  @Post()
  @ApiOperation({ summary: 'Create fraud rule' })
  async createRule(@Body() dto: any) {
    return this.rulesService.createRule(dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update fraud rule' })
  async updateRule(@Param('id') id: string, @Body() dto: any) {
    return this.rulesService.updateRule(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete fraud rule' })
  async deleteRule(@Param('id') id: string) {
    return this.rulesService.deleteRule(id);
  }
}
