/**
 * Country strategy factory
 * Factory pattern to create appropriate country strategies
 */

import type { CountryISO } from '../entities/Appointment.js';
import type { ICountryStrategy } from './ICountryStrategy.js';
import { PeruStrategy } from './PeruStrategy.js';
import { ChileStrategy } from './ChileStrategy.js';
import { ValidationError } from '@/shared/domain/errors/index.js';

/**
 * Factory service for creating country-specific strategies
 */
export class CountryStrategyFactory {
  private static readonly strategies = new Map<
    CountryISO,
    () => ICountryStrategy
  >([
    ['PE', () => new PeruStrategy()],
    ['CL', () => new ChileStrategy()],
  ]);

  /**
   * Create strategy for the given country
   *
   * @param countryISO - Country code
   * @returns Country strategy instance
   * @throws ValidationError if country is not supported
   *
   * @example
   * ```typescript
   * const strategy = CountryStrategyFactory.create('PE');
   * const result = await strategy.processAppointment(appointment);
   * ```
   */
  public static create(countryISO: CountryISO): ICountryStrategy {
    const strategyFactory = this.strategies.get(countryISO);

    if (!strategyFactory) {
      throw new ValidationError(`Unsupported country: ${countryISO}`, {
        countryISO,
        supportedCountries: Array.from(this.strategies.keys()),
      });
    }

    return strategyFactory();
  }

  /**
   * Get list of supported countries
   *
   * @returns Array of supported country codes
   */
  public static getSupportedCountries(): CountryISO[] {
    return Array.from(this.strategies.keys());
  }

  /**
   * Check if country is supported
   *
   * @param countryISO - Country code to check
   * @returns True if country is supported
   */
  public static isSupported(countryISO: string): countryISO is CountryISO {
    return this.strategies.has(countryISO as CountryISO);
  }
}
