import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly resend: Resend;
  private readonly fromEmail: string;
  private readonly fromName: string;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('RESEND_API_KEY');
    if (!apiKey) {
      throw new Error('RESEND_API_KEY is required');
    }

    this.resend = new Resend(apiKey);
    this.fromEmail =
      this.configService.get<string>('RESEND_FROM_EMAIL') ?? 'noreply@mimichatbot.fun';
    this.fromName = this.configService.get<string>('RESEND_FROM_NAME') ?? 'Mimi Expense AI';
  }

  async sendPasswordResetEmail(email: string, resetToken: string): Promise<void> {
    try {
      const resetUrl = `${this.configService.get<string>('FRONTEND_URL') ?? 'http://localhost:3000'}/reset-password?token=${resetToken}`;

      await this.resend.emails.send({
        from: `${this.fromName} <${this.fromEmail}>`,
        to: email,
        subject: 'Đặt lại mật khẩu - Mimi Expense AI',
        html: this.getPasswordResetHtml(resetUrl),
        text: this.getPasswordResetText(resetUrl),
      });

      this.logger.log(`Password reset email sent to ${email}`);
    } catch (error) {
      this.logger.error(`Failed to send password reset email to ${email}:`, error);
      throw new Error('Không thể gửi email đặt lại mật khẩu');
    }
  }

  private getPasswordResetHtml(resetUrl: string): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #0ea5e9, #06b6d4); padding: 20px; border-radius: 8px; text-align: center; margin-bottom: 20px;">
          <h1 style="color: white; margin: 0;">Mimi Expense AI</h1>
        </div>
        
        <div style="background: #f8fafc; padding: 20px; border-radius: 8px; border: 1px solid #e2e8f0;">
          <h2 style="color: #1e293b; margin-top: 0;">Đặt lại mật khẩu</h2>
          <p>Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn.</p>
          
          <div style="text-align: center; margin: 20px 0;">
            <a href="${resetUrl}" 
               style="background: #0ea5e9; color: white; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: bold; display: inline-block;">
              Đặt lại mật khẩu
            </a>
          </div>
          
          <p style="color: #64748b; font-size: 14px;">
            Nếu nút không hoạt động, sao chép liên kết: <br>
            <span style="word-break: break-all; background: #e2e8f0; padding: 8px; border-radius: 4px; font-family: monospace; font-size: 12px;">${resetUrl}</span>
          </p>
          
          <p style="color: #64748b; font-size: 14px;">
            <strong>Lưu ý:</strong> Liên kết này sẽ hết hạn sau 1 giờ.
          </p>
        </div>
      </div>
    `;
  }

  private getPasswordResetText(resetUrl: string): string {
    return `Mimi Expense AI - Đặt lại mật khẩu

Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn.

Nhấp vào liên kết sau để đặt lại mật khẩu mới:
${resetUrl}

Lưu ý: Liên kết này sẽ hết hạn sau 1 giờ.`;
  }
}
