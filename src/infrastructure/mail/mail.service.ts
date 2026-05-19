import { Injectable, Logger } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(private readonly mailerService: MailerService) {}

  async sendOtp(email: string, otp: string): Promise<void> {
    this.logger.log(`Sending OTP to ${email}...`);
    try {
      await this.mailerService.sendMail({
        to: email,
        subject: 'Amaly — Tasdiqlash kodi',
        html: `
          <div style="font-family: sans-serif; max-width: 480px; margin: auto;">
            <h2 style="color: #4F46E5;">Amaly</h2>
            <p>Tasdiqlash kodingiz:</p>
            <h1 style="letter-spacing: 8px; color: #111;">${otp}</h1>
            <p style="color: #888;">Kod <b>5 daqiqa</b> ichida amal qiladi.</p>
          </div>
        `,
      });
      this.logger.log(`OTP sent successfully to ${email}`);
    } catch (err) {
      this.logger.error(`Failed to send OTP to ${email}`, err);
      throw err;
    }
  }
}