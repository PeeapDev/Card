import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ApiResponseDto<T> {
  @ApiProperty()
  success!: boolean;

  @ApiPropertyOptional()
  data?: T;

  @ApiPropertyOptional()
  message?: string;

  @ApiPropertyOptional()
  error?: {
    code: string;
    message: string;
    details?: Record<string, any>;
  };

  @ApiProperty()
  timestamp!: string;

  @ApiPropertyOptional()
  requestId?: string;

  constructor(partial: Partial<ApiResponseDto<T>>) {
    Object.assign(this, partial);
    this.timestamp = new Date().toISOString();
  }

  static success<T>(data: T, message?: string): ApiResponseDto<T> {
    return new ApiResponseDto({
      success: true,
      data,
      message,
    });
  }

  static error(code: string, message: string, details?: Record<string, any>): ApiResponseDto<null> {
    return new ApiResponseDto({
      success: false,
      error: {
        code,
        message,
        details,
      },
    });
  }
}
