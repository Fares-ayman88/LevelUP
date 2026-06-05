import { InstructorRequest } from '../models/InstructorRequest.js';
import { AppError } from '../errors/AppError.js';

export class InstructorRequestRepository {
  async create(data) {
    const request = new InstructorRequest(data);
    return request.save();
  }

  async save(request) {
    return request.save();
  }

  async findById(id) {
    if (!id) return null;
    return InstructorRequest.findById(id).where('deletedAt').equals(null);
  }

  async findByIdOrThrow(id) {
    const request = await this.findById(id);
    if (!request) {
      throw new AppError('Instructor request not found', 404, 'NOT_FOUND');
    }
    return request;
  }

  async findByEmail(email) {
    if (!email) return null;
    return InstructorRequest.findOne({
      email: email.toLowerCase().trim(),
      deletedAt: null,
    });
  }

  async findByUserId(userId) {
    if (!userId) return null;
    return InstructorRequest.findOne({
      userId: userId.trim(),
      deletedAt: null,
    }).sort({ createdAt: -1 });
  }

  async findAll(filters = {}, options = {}) {
    const { skip = 0, limit = 50, sort = { createdAt: -1 } } = options;

    const query = { deletedAt: null };

    if (filters.status) {
      query.status = filters.status;
    }
    if (filters.category) {
      query.category = filters.category;
    }
    if (filters.userId) {
      query.userId = filters.userId.trim();
    }
    if (filters.email) {
      query.email = filters.email.toLowerCase().trim();
    }

    const [items, total] = await Promise.all([
      InstructorRequest.find(query)
        .sort(sort)
        .skip(Math.max(0, skip))
        .limit(Math.max(1, Math.min(limit, 100)))
        .lean(),
      InstructorRequest.countDocuments(query),
    ]);

    return {
      items,
      total,
      skip: Math.max(0, skip),
      limit: Math.max(1, Math.min(limit, 100)),
    };
  }

  async updateStatus(id, status, additionalData = {}) {
    const request = await this.findByIdOrThrow(id);

    request.status = status;
    if (status === 'approved') {
      request.approvedAt = new Date();
    } else if (status === 'rejected') {
      request.rejectedAt = new Date();
      if (additionalData.rejectionReason) {
        request.rejectionReason = additionalData.rejectionReason;
      }
    }

    Object.assign(request, additionalData);
    return request.save();
  }

  async softDelete(id) {
    const request = await this.findByIdOrThrow(id);
    request.deletedAt = new Date();
    return request.save();
  }

  async countByStatus(status) {
    return InstructorRequest.countDocuments({
      status,
      deletedAt: null,
    });
  }

  async countByCategory(category) {
    return InstructorRequest.countDocuments({
      category,
      deletedAt: null,
    });
  }

  async getStats() {
    const [pending, approved, rejected, revoked] = await Promise.all([
      this.countByStatus('pending'),
      this.countByStatus('approved'),
      this.countByStatus('rejected'),
      this.countByStatus('revoked'),
    ]);

    return {
      pending,
      approved,
      rejected,
      revoked,
      total: pending + approved + rejected + revoked,
    };
  }

  async findRecentByEmail(email, hoursWindow = 24) {
    if (!email) return null;
    const startTime = new Date(Date.now() - hoursWindow * 60 * 60 * 1000);
    return InstructorRequest.findOne({
      email: email.toLowerCase().trim(),
      createdAt: { $gte: startTime },
    });
  }
}
