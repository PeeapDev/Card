import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiResponseDto } from '../dto/api-response.dto';

@Injectable()
export class TransformInterceptor<T>
  implements NestInterceptor<T, ApiResponseDto<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiResponseDto<T>> {
    const request = context.switchToHttp().getRequest();
    const requestId = request.headers['x-request-id'];

    return next.handle().pipe(
      map((data) => {
        // If response is already an ApiResponseDto, just add requestId
        if (data instanceof ApiResponseDto) {
          data.requestId = requestId;
          return data;
        }

        // Wrap response in ApiResponseDto
        const response = ApiResponseDto.success(data);
        response.requestId = requestId;
        return response;
      }),
    );
  }
}
