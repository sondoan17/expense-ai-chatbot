import { ConfigService } from '@nestjs/config';

export function getRequiredEnv(
  configService: ConfigService,
  key: string,
  options: { minLength?: number } = {},
): string {
  const value = configService.get<string>(key)?.trim();
  const minLength = options.minLength ?? 1;

  if (!value || value.length < minLength) {
    throw new Error(`${key} must be configured with at least ${minLength} characters`);
  }

  return value;
}

export function isTruthyEnv(value: string | undefined): boolean {
  return ['1', 'true', 'yes', 'on'].includes(value?.trim().toLowerCase() ?? '');
}
