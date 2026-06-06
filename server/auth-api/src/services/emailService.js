import { logger } from '../utils/logger.js';
import { env } from '../config/env.js';

export class EmailService {
  async createTransport() {
    if (!env.smtp.host || !env.smtp.user || !env.smtp.pass) {
      return null;
    }

    const nodemailer = await import('nodemailer');
    return nodemailer.createTransport({
      host: env.smtp.host,
      port: env.smtp.port,
      secure: env.smtp.port === 465,
      auth: {
        user: env.smtp.user,
        pass: env.smtp.pass,
      },
    });
  }

  async sendMail({ to, subject, text, replyTo }) {
    const transport = await this.createTransport();
    if (!transport) {
      logger.info('SMTP is not configured; email content logged instead', { to, subject, text, replyTo });
      return;
    }

    await transport.sendMail({
      from: env.smtp.from,
      to,
      replyTo,
      subject,
      text,
    });
  }

  async sendVerificationEmail(emailOrUser, otp) {
    const email = typeof emailOrUser === 'string' ? emailOrUser : emailOrUser.email;
    await this.sendMail({
      to: email,
      subject: 'Your LevelUp verification code',
      text: `Welcome to LevelUp.\n\nYour email verification code is: ${otp}\n\nThis code expires in ${env.otpExpiresMinutes} minutes. Do not share it with anyone.`,
    });
  }

  async sendPasswordResetEmail(user, token) {
    const url = `${env.clientUrl}/reset-password?token=${token}`;
    await this.sendMail({
      to: user.email,
      subject: 'Reset your LevelUp password',
      text: `Reset your password using this link: ${url}`,
    });
  }
}
