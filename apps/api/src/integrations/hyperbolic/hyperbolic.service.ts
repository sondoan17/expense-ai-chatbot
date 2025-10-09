import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

type ChatRole = 'system' | 'user' | 'assistant';

export interface HyperbolicMessage {
  role: ChatRole;
  content: string;
}

interface HyperbolicResponseFormat {
  type: 'text' | 'json_object';
  [key: string]: unknown;
}

interface HyperbolicOptions {
  model?: string;
  max_tokens?: number;
  temperature?: number;
  top_p?: number;
  response_format?: HyperbolicResponseFormat;
  stream?: boolean;
}

interface HyperbolicChoice {
  message?: {
    role: ChatRole;
    content?: string;
  };
}

interface HyperbolicResponseBody {
  choices?: HyperbolicChoice[];
}

interface HyperbolicRequestPayload {
  model: string;
  messages: HyperbolicMessage[];
  max_tokens: number;
  temperature: number;
  top_p: number;
  stream: boolean;
  response_format?: HyperbolicResponseFormat;
}

@Injectable()
export class HyperbolicService {
  private readonly logger = new Logger(HyperbolicService.name);
  private readonly url: string;
  private readonly apiKey: string;
  private readonly model: string;

  constructor(private readonly configService: ConfigService) {
    this.url =
      this.configService.get<string>('HYPERBOLIC_API_URL') ??
      'https://api.hyperbolic.xyz/v1/chat/completions';
    this.apiKey = this.configService.get<string>('HYPERBOLIC_API_KEY') ?? '';
    this.model =
      this.configService.get<string>('HYPERBOLIC_MODEL') ?? 'Qwen/Qwen3-Next-80B-A3B-Instruct';
  }

  async complete(messages: HyperbolicMessage[], options?: HyperbolicOptions): Promise<string> {
    if (!this.apiKey) {
      throw new Error('Hyperbolic API key is not configured');
    }

    try {
      const payload: HyperbolicRequestPayload = {
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
        const text = await response.text();
        this.logger.error(`Hyperbolic request failed ${response.status}: ${text}`);
        throw new Error(`Hyperbolic error ${response.status}`);
      }

      const json = (await response.json()) as HyperbolicResponseBody;
      const content = json.choices?.[0]?.message?.content;

      if (!content) {
        this.logger.error('Hyperbolic response did not include a message content');
        throw new Error('Invalid Hyperbolic response');
      }

      return content;
    } catch (error) {
      this.logger.error(
        'Hyperbolic request failed',
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }
}
