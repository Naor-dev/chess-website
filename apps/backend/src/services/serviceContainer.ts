import { prisma } from '../database/prisma';
import { UserRepository } from '../repositories/UserRepository';
import { AuthService } from './authService';

/**
 * Service container providing singleton instances of all services.
 * Ensures consistent service instances across the application.
 */
class ServiceContainer {
  private static instance: ServiceContainer;

  public readonly userRepository: UserRepository;
  public readonly authService: AuthService;

  private constructor() {
    this.userRepository = new UserRepository(prisma);
    this.authService = new AuthService(this.userRepository);
  }

  public static getInstance(): ServiceContainer {
    if (!ServiceContainer.instance) {
      ServiceContainer.instance = new ServiceContainer();
    }
    return ServiceContainer.instance;
  }
}

export const services = ServiceContainer.getInstance();
