import { prisma } from '../database/prisma';
import { UserRepository } from '../repositories/UserRepository';
import { GameRepository } from '../repositories/GameRepository';
import { AuthService } from './authService';
import { GameService } from './gameService';
import { EngineService } from './engineService';

/**
 * Service container providing singleton instances of all services.
 * Ensures consistent service instances across the application.
 */
class ServiceContainer {
  private static instance: ServiceContainer;

  public readonly userRepository: UserRepository;
  public readonly gameRepository: GameRepository;
  public readonly authService: AuthService;
  public readonly engineService: EngineService;
  public readonly gameService: GameService;

  private constructor() {
    this.userRepository = new UserRepository(prisma);
    this.gameRepository = new GameRepository(prisma);
    this.authService = new AuthService(this.userRepository);
    this.engineService = new EngineService();
    this.gameService = new GameService(this.gameRepository, this.engineService);
  }

  public static getInstance(): ServiceContainer {
    if (!ServiceContainer.instance) {
      ServiceContainer.instance = new ServiceContainer();
    }
    return ServiceContainer.instance;
  }

  /**
   * Dispose of all services that hold resources.
   * Should be called during graceful shutdown.
   */
  public async dispose(): Promise<void> {
    await this.engineService.dispose();
  }
}

export const services = ServiceContainer.getInstance();
