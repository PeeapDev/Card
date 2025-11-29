import { Controller, Get, Post, Put, Delete, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { TemplatesService } from './templates.service';

@ApiTags('Templates')
@Controller('templates')
export class TemplatesController {
  constructor(private readonly templatesService: TemplatesService) {}

  @Get()
  @ApiOperation({ summary: 'List all templates' })
  async findAll() {
    return this.templatesService.findAll();
  }

  @Post()
  @ApiOperation({ summary: 'Create template' })
  async create(@Body() dto: any) {
    return this.templatesService.create(dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update template' })
  async update(@Param('id') id: string, @Body() dto: any) {
    return this.templatesService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete template' })
  async delete(@Param('id') id: string) {
    await this.templatesService.delete(id);
    return { deleted: true };
  }
}
