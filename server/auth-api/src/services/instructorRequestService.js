import { InstructorRequestRepository } from '../repositories/instructorRequestRepository.js';
import { EmailService } from './emailService.js';
import { AppError } from '../errors/AppError.js';
import { env } from '../config/env.js';

const instructorRequestRepository = new InstructorRequestRepository();
const emailService = new EmailService();

export class InstructorRequestService {
  async submitRequest(payload) {
    const normalizedEmail = payload.email.toLowerCase().trim();

    // Check for duplicate submission in last 24 hours
    const recentRequest = await instructorRequestRepository.findRecentByEmail(normalizedEmail, 24);
    if (recentRequest) {
      throw new AppError(
        'You have already submitted an application. Please wait 24 hours before resubmitting.',
        429,
        'DUPLICATE_REQUEST',
      );
    }

    // Create the request
    const request = await instructorRequestRepository.create({
      userId: payload.userId,
      name: payload.name,
      email: normalizedEmail,
      phone: payload.phone,
      category: payload.category,
      coursesTaken: payload.coursesTaken || '',
      experienceYears: payload.experienceYears || 0,
      notes: payload.notes || '',
    });

    // Notify both sides. Failures are logged inside each method and do not block request creation.
    await this.sendAdminNotificationEmail(request);
    await this.sendConfirmationEmail(request);

    return request;
  }

  async getRequest(id) {
    return instructorRequestRepository.findByIdOrThrow(id);
  }

  async listRequests(filters = {}, options = {}) {
    return instructorRequestRepository.findAll(filters, options);
  }

  async updateStatus(id, status, additionalData = {}) {
    const validStatuses = ['pending', 'approved', 'rejected', 'revoked'];
    if (!validStatuses.includes(status)) {
      throw new AppError(`Invalid status: ${status}`, 400, 'INVALID_STATUS');
    }

    const request = await instructorRequestRepository.updateStatus(id, status, additionalData);

    // Send status update email
    await this.sendStatusUpdateEmail(request, status);

    return request;
  }

  async getStats() {
    return instructorRequestRepository.getStats();
  }

  async deleteRequest(id) {
    return instructorRequestRepository.softDelete(id);
  }

  async sendConfirmationEmail(request) {
    try {
      const confirmationUrl = `${env.clientUrl || 'https://levelup.com'}/instructor-documents?email=${encodeURIComponent(request.email)}`;
      const message = `
Thank you for your instructor registration application, ${request.name}!

Your application has been received. Here's what happens next:
1. Our team will review your application
2. We will send you a WhatsApp message for document verification
3. You will need to provide your CV and ID

Application Details:
- Category: ${request.category}
- Experience: ${request.experienceYears} years
- Phone: ${request.phone}

Next Steps: ${confirmationUrl}

If you have any questions, reply to this email.

Best regards,
LevelUp Team
      `.trim();

      await emailService.sendMail({
        to: request.email,
        subject: 'Instructor Application Received - LevelUp',
        text: message,
      });
    } catch (error) {
      console.error('Failed to send confirmation email:', error);
    }
  }

  async sendAdminNotificationEmail(request) {
    try {
      if (!env.smtp.adminEmail) {
        console.warn('Instructor request admin email skipped: LEVELUP_ADMIN_EMAIL/ADMIN_EMAIL/SMTP_TO is not configured.');
        return;
      }

      const message = `
New instructor application received.

Name: ${request.name}
Email: ${request.email}
Phone: ${request.phone}
Category: ${request.category}
Courses Taken: ${request.coursesTaken || '-'}
Experience Years: ${request.experienceYears || 0}
Notes: ${request.notes || '-'}
Request ID: ${request.id}
Status: ${request.status}

Open the admin dashboard to approve or reject this request.
      `.trim();

      await emailService.sendMail({
        to: env.smtp.adminEmail,
        replyTo: request.email,
        subject: `New instructor application: ${request.name || request.email}`,
        text: message,
      });
    } catch (error) {
      console.error('Failed to send admin instructor request email:', error);
    }
  }

  async sendStatusUpdateEmail(request, status) {
    try {
      let subject = '';
      let message = '';

      if (status === 'approved') {
        subject = 'Your Instructor Application Approved - LevelUp';
        message = `
Hi ${request.name},

Congratulations! Your instructor application has been approved.

You can now create and manage courses on LevelUp. Log in to your account to get started.

Welcome to the LevelUp instructor team!

Best regards,
LevelUp Team
        `.trim();
      } else if (status === 'rejected') {
        subject = 'Instructor Application Status Update - LevelUp';
        message = `
Hi ${request.name},

Thank you for your interest in becoming an instructor on LevelUp.

Unfortunately, your application could not be approved at this time.
${request.rejectionReason ? `Reason: ${request.rejectionReason}` : ''}

You can reapply after 30 days. If you have any questions, please contact us.

Best regards,
LevelUp Team
        `.trim();
      }

      if (subject && message) {
        await emailService.sendMail({
          to: request.email,
          subject,
          text: message,
        });
      }
    } catch (error) {
      console.error('Failed to send status update email:', error);
    }
  }
}
