import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotificationTemplate, NotificationChannel } from '@payment-system/database';

@Injectable()
export class TemplatesService {
  constructor(
    @InjectRepository(NotificationTemplate)
    private readonly templateRepository: Repository<NotificationTemplate>,
  ) {}

  async create(data: Partial<NotificationTemplate>): Promise<NotificationTemplate> {
    const template = this.templateRepository.create(data);
    return this.templateRepository.save(template);
  }

  async findAll(): Promise<NotificationTemplate[]> {
    return this.templateRepository.find({ order: { name: 'ASC' } });
  }

  async findByCode(code: string, channel: NotificationChannel): Promise<NotificationTemplate | null> {
    return this.templateRepository.findOne({ where: { code, channel, active: true } });
  }

  async update(id: string, data: Partial<NotificationTemplate>): Promise<NotificationTemplate> {
    await this.templateRepository.update(id, data);
    return this.templateRepository.findOneOrFail({ where: { id } });
  }

  async delete(id: string): Promise<void> {
    await this.templateRepository.delete(id);
  }
}
