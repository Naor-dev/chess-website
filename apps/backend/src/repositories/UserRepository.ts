import { PrismaClient, User, Prisma } from '@prisma/client';
import * as Sentry from '@sentry/node';

export interface CreateUserData {
  googleId: string;
  email: string;
  displayName: string;
}

// Re-export Prisma types for use by services
export { User };

export class UserRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(data: CreateUserData): Promise<User> {
    Sentry.addBreadcrumb({
      message: 'Creating user in database',
      category: 'database',
      data: { email: data.email },
    });

    return this.prisma.user.create({ data });
  }

  async findById(userId: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { id: userId },
    });
  }

  async findByGoogleId(googleId: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { googleId },
    });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  async findOrCreate(data: CreateUserData): Promise<User> {
    const existing = await this.findByGoogleId(data.googleId);
    if (existing) {
      return existing;
    }
    return this.create(data);
  }

  async update(userId: string, data: Prisma.UserUpdateInput): Promise<User> {
    Sentry.addBreadcrumb({
      message: 'Updating user in database',
      category: 'database',
      data: { userId },
    });

    return this.prisma.user.update({
      where: { id: userId },
      data,
    });
  }
}
