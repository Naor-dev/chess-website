import { PrismaClient, User, Prisma } from '@prisma/client';
import { BaseRepository } from './BaseRepository';

/** Data required to create a new user */
export interface CreateUserData {
  googleId: string;
  email: string;
  displayName: string;
}

/** Result of findOrCreate operation */
export interface FindOrCreateResult {
  user: User;
  isNew: boolean;
}

// Re-export Prisma types for use by services
export { User };

/**
 * Repository for user database operations.
 * Handles all CRUD operations for users with proper error tracking.
 */
export class UserRepository extends BaseRepository {
  constructor(prisma: PrismaClient) {
    super(prisma, 'UserRepository');
  }

  /**
   * Creates a new user in the database.
   * @param data - User creation data from OAuth
   * @returns The created user
   */
  async create(data: CreateUserData): Promise<User> {
    return this.executeWithErrorHandling('create', () => this.prisma.user.create({ data }), {
      email: data.email,
    });
  }

  /**
   * Finds a user by their internal ID.
   * @param userId - The user's unique identifier
   * @returns The user or null if not found
   */
  async findById(userId: string): Promise<User | null> {
    return this.executeWithErrorHandling(
      'findById',
      () =>
        this.prisma.user.findUnique({
          where: { id: userId },
        }),
      { userId }
    );
  }

  /**
   * Finds a user by their Google OAuth ID.
   * @param googleId - The Google OAuth identifier
   * @returns The user or null if not found
   */
  async findByGoogleId(googleId: string): Promise<User | null> {
    return this.executeWithErrorHandling(
      'findByGoogleId',
      () =>
        this.prisma.user.findUnique({
          where: { googleId },
        }),
      { googleId }
    );
  }

  /**
   * Finds a user by their email address.
   * @param email - The user's email
   * @returns The user or null if not found
   */
  async findByEmail(email: string): Promise<User | null> {
    return this.executeWithErrorHandling(
      'findByEmail',
      () =>
        this.prisma.user.findUnique({
          where: { email },
        }),
      { email }
    );
  }

  /**
   * Finds an existing user by Google ID or creates a new one.
   * Used during OAuth authentication flow.
   * @param data - User data from OAuth provider
   * @returns The existing or newly created user with isNew flag
   */
  async findOrCreate(data: CreateUserData): Promise<FindOrCreateResult> {
    return this.executeWithErrorHandling(
      'findOrCreate',
      async () => {
        const existing = await this.prisma.user.findUnique({
          where: { googleId: data.googleId },
        });
        if (existing) {
          return { user: existing, isNew: false };
        }
        const newUser = await this.prisma.user.create({ data });
        return { user: newUser, isNew: true };
      },
      { email: data.email }
    );
  }

  /**
   * Updates a user's profile data.
   * @param userId - The user's unique identifier
   * @param data - Fields to update
   * @returns The updated user
   */
  async update(userId: string, data: Prisma.UserUpdateInput): Promise<User> {
    return this.executeWithErrorHandling(
      'update',
      () =>
        this.prisma.user.update({
          where: { id: userId },
          data,
        }),
      { userId, fields: Object.keys(data) }
    );
  }

  /**
   * Counts total users in the system.
   * @returns Total user count
   */
  async count(): Promise<number> {
    return this.executeWithErrorHandling('count', () => this.prisma.user.count());
  }
}
