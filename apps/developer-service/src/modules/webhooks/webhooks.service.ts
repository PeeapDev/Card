import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HttpService } from '@nestjs/axios';
import { WebhookEndpoint, WebhookDelivery, WebhookStatus, WebhookDeliveryStatus } from '@payment-system/database';
import { generateHmacSignature } from '@payment-system/common';
import { firstValueFrom, timeout, catchError } from 'rxjs';
import * as crypto from 'crypto';

interface CreateWebhookDto {
  merchantId: string;
  url: string;
  events: string[];
}

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  constructor(
    @InjectRepository(WebhookEndpoint)
    private readonly endpointRepository: Repository<WebhookEndpoint>,
    @InjectRepository(WebhookDelivery)
    private readonly deliveryRepository: Repository<WebhookDelivery>,
    private readonly httpService: HttpService,
  ) {}

  async createEndpoint(dto: CreateWebhookDto): Promise<{ endpoint: WebhookEndpoint; secret: string }> {
    const secret = `whsec_${crypto.randomBytes(24).toString('hex')}`;
    const secretHash = crypto.createHash('sha256').update(secret).digest('hex');

    const endpoint = this.endpointRepository.create({
      merchantId: dto.merchantId,
      url: dto.url,
      secretHash,
      events: dto.events,
      status: WebhookStatus.ACTIVE,
    });

    await this.endpointRepository.save(endpoint);
    this.logger.log(`Webhook endpoint created: ${endpoint.id}`);

    return { endpoint, secret };
  }

  async getEndpoints(merchantId: string): Promise<WebhookEndpoint[]> {
    return this.endpointRepository.find({
      where: { merchantId },
      order: { createdAt: 'DESC' },
    });
  }

  async deleteEndpoint(id: string): Promise<void> {
    await this.endpointRepository.delete(id);
  }

  async deliverWebhook(
    endpointId: string,
    eventType: string,
    eventId: string,
    payload: any,
  ): Promise<WebhookDelivery> {
    const endpoint = await this.endpointRepository.findOne({ where: { id: endpointId } });
    if (!endpoint) throw new NotFoundException('Endpoint not found');

    const delivery = this.deliveryRepository.create({
      endpointId,
      eventType,
      eventId,
      payload,
      status: WebhookDeliveryStatus.PENDING,
    });

    await this.deliveryRepository.save(delivery);

    // Attempt delivery
    await this.attemptDelivery(delivery, endpoint);

    return delivery;
  }

  private async attemptDelivery(delivery: WebhookDelivery, endpoint: WebhookEndpoint): Promise<void> {
    const timestamp = Math.floor(Date.now() / 1000);
    const payloadString = JSON.stringify(delivery.payload);
    const signature = generateHmacSignature(payloadString, endpoint.secretHash, timestamp);

    delivery.attemptCount++;

    const startTime = Date.now();

    try {
      const response = await firstValueFrom(
        this.httpService.post(endpoint.url, delivery.payload, {
          headers: {
            'Content-Type': 'application/json',
            'X-Webhook-Signature': `t=${timestamp},v1=${signature}`,
            'X-Webhook-Event': delivery.eventType,
            'X-Webhook-ID': delivery.eventId,
          },
          timeout: 30000,
        }).pipe(
          timeout(30000),
          catchError(error => {
            throw error;
          }),
        ),
      );

      delivery.responseTimeMs = Date.now() - startTime;
      delivery.responseStatus = response.status;
      delivery.status = WebhookDeliveryStatus.SUCCESS;
      delivery.deliveredAt = new Date();

      endpoint.lastSuccessAt = new Date();
      endpoint.failureCount = 0;
    } catch (error: any) {
      delivery.responseTimeMs = Date.now() - startTime;
      delivery.errorMessage = error.message;
      delivery.responseStatus = error.response?.status;

      if (delivery.attemptCount < delivery.maxAttempts) {
        delivery.status = WebhookDeliveryStatus.RETRYING;
        // Exponential backoff
        const delay = Math.pow(2, delivery.attemptCount) * 60 * 1000;
        delivery.nextRetryAt = new Date(Date.now() + delay);
      } else {
        delivery.status = WebhookDeliveryStatus.FAILED;
      }

      endpoint.failureCount++;
      endpoint.lastFailureAt = new Date();
      endpoint.lastFailureReason = error.message;

      // Disable endpoint after too many failures
      if (endpoint.failureCount >= 10) {
        endpoint.status = WebhookStatus.FAILED;
      }
    }

    await this.deliveryRepository.save(delivery);
    await this.endpointRepository.save(endpoint);
  }

  async getDeliveries(endpointId: string): Promise<WebhookDelivery[]> {
    return this.deliveryRepository.find({
      where: { endpointId },
      order: { createdAt: 'DESC' },
      take: 100,
    });
  }

  async retryDelivery(deliveryId: string): Promise<WebhookDelivery> {
    const delivery = await this.deliveryRepository.findOne({ where: { id: deliveryId } });
    if (!delivery) throw new NotFoundException('Delivery not found');

    const endpoint = await this.endpointRepository.findOne({ where: { id: delivery.endpointId } });
    if (!endpoint) throw new NotFoundException('Endpoint not found');

    delivery.status = WebhookDeliveryStatus.PENDING;
    await this.attemptDelivery(delivery, endpoint);

    return delivery;
  }
}
