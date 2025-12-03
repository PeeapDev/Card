import { Controller, Post, Body, HttpException, HttpStatus } from '@nestjs/common';
import { UsersService, CreateUserDto } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post('admin/create')
  async createUser(@Body() dto: CreateUserDto) {
    try {
      const result = await this.usersService.createUser(dto);
      return {
        success: true,
        user: result.user,
        message: 'User created successfully',
      };
    } catch (error: any) {
      throw new HttpException(
        {
          success: false,
          message: error.message || 'Failed to create user',
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }
}
