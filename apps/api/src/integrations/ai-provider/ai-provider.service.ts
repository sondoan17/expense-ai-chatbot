import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { getRequiredEnv } from '../../common/config/required-env';

type ChatRole = 'system' | 'user' | 'assistant';

export interface AiProviderMessage {
  role: ChatRole;
  content: string;
}

interface AiProviderResponseFormat {
  type: 'text' | 'json_object';
  [key: string]: unknown;
}

interface AiProviderOptions {
  model?: string;
  max_tokens?: number;
  temperature?: number;
  top_p?: number;
  response_format?: AiProviderResponseFormat;
  stream?: boolean;
}

interface AiProviderChoice {
  message?: {
    role: ChatRole;
    content?: string;
  };
}

interface AiProviderResponseBody {
  choices?: AiProviderChoice[];
}

interface AiProviderRequestPayload {
  model: string;
  messages: AiProviderMessage[];
  max_tokens: number;
  temperature: number;
  top_p: number;
  stream: boolean;
  response_format?: AiProviderResponseFormat;
}

@Injectable()
export class AiProviderService {
  private readonly logger = new Logger(AiProviderService.name);
  private readonly url: string;
  private readonly apiKey: string;
  private readonly model: string;

  constructor(private readonly configService: ConfigService) {
    const providerUrl = getRequiredEnv(this.configService, 'PROVIDER_URL');
    const normalizedProviderUrl = providerUrl.endsWith('/chat/completions')
      ? providerUrl
      : `${providerUrl.replace(/\/$/, '')}/chat/completions`;

    try {
      this.url = new URL(normalizedProviderUrl).toString();
    } catch {
      throw new Error('PROVIDER_URL must be a valid URL');
    }

    this.apiKey = getRequiredEnv(this.configService, 'PROVIDER_API_KEY');
    this.model = this.configService.get<string>('AI_MODEL') ?? 'cx/gpt-5.5';
  }

  async complete(messages: AiProviderMessage[], options?: AiProviderOptions): Promise<string> {
    try {
      const payload: AiProviderRequestPayload = {
        model: options?.model ?? this.model,
        messages,
        max_tokens: options?.max_tokens ?? 50000,
        temperature: options?.temperature ?? 0.7,
        top_p: options?.top_p ?? 0.8,
        stream: options?.stream ?? false,
        response_format: options?.response_format ?? { type: 'json_object' },
      };

      if (options?.response_format) {
        payload.response_format = options.response_format;
      }

      const response = await fetch(this.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        await response.body?.cancel();
        this.logger.error(`AI provider request failed with status ${response.status}`);
        throw new Error(`AI provider error ${response.status}`);
      }

      const json = (await response.json()) as AiProviderResponseBody;
      const content = json.choices?.[0]?.message?.content;

      if (!content) {
        this.logger.error('AI provider response did not include a message content');
        throw new Error('Invalid AI provider response');
      }

      return content;
    } catch (error) {
      this.logger.error(
        'AI provider request failed',
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }
}
