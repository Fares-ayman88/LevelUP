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

  async sendVerificationEmail(user, token) {
    const url = `${env.clientUrl}/verify-email?token=${token}`;
    await this.sendMail({
      to: user.email,
      subject: 'Verify your LevelUp email',
      text: `Welcome to LevelUp. Verify your email using this link: ${url}`,
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
