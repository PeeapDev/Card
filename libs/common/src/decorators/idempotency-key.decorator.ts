import { createParamDecorator, ExecutionContext, BadRequestException } from '@nestjs/common';

export const IDEMPOTENCY_HEADER = 'x-idempotency-key';

/**
 * Decorator to extract idempotency key from request headers
 * Used for ensuring payment operations are safely retryable
 */
export const IdempotencyKey = createParamDecorator(
  (required: boolean = true, ctx: ExecutionContext): string | undefined => {
    const request = ctx.switchToHttp().getRequest();
    const idempotencyKey = request.headers[IDEMPOTENCY_HEADER];

    if (required && !idempotencyKey) {
      throw new BadRequestException(
        `Missing required header: ${IDEMPOTENCY_HEADER}`,
      );
    }

    return idempotencyKey;
  },
);
