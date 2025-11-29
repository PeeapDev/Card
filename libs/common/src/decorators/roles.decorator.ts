import { SetMetadata } from '@nestjs/common';
import { Role } from '../constants/roles.constant';

export const ROLES_KEY = 'roles';

/**
 * Decorator to specify required roles for a route
 */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
