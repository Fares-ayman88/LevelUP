import { InstructorRequestService } from '../services/instructorRequestService.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { AppError } from '../errors/AppError.js';

const instructorRequestService = new InstructorRequestService();

export const instructorRequestController = {
  submit: asyncHandler(async (req, res) => {
    const request = await instructorRequestService.submitRequest(req.body);
    res.status(201).json({
      status: 'success',
      data: { item: request },
    });
  }),

  list: asyncHandler(async (req, res) => {
    const filters = {};
    const options = {};

    if (req.query.status) {
      filters.status = req.query.status;
    }
    if (req.query.category) {
      filters.category = req.query.category;
    }
    if (req.query.userId) {
      filters.userId = req.query.userId;
    }
    if (req.query.email) {
      filters.email = req.query.email;
    }

    if (req.query.skip) {
      options.skip = Math.max(0, parseInt(req.query.skip, 10));
    }
    if (req.query.limit) {
      options.limit = Math.max(1, Math.min(100, parseInt(req.query.limit, 10)));
    }

    const result = await instructorRequestService.listRequests(filters, options);
    res.status(200).json({
      status: 'success',
      data: result,
    });
  }),

  get: asyncHandler(async (req, res) => {
    const request = await instructorRequestService.getRequest(req.params.id);
    res.status(200).json({
      status: 'success',
      data: { item: request },
    });
  }),

  updateStatus: asyncHandler(async (req, res) => {
    const { status, rejectionReason } = req.body;

    if (!status) {
      throw new AppError('Status is required', 400, 'VALIDATION_ERROR');
    }

    const request = await instructorRequestService.updateStatus(req.params.id, status, {
      rejectionReason,
    });

    res.status(200).json({
      status: 'success',
      data: { item: request },
    });
  }),

  delete: asyncHandler(async (req, res) => {
    await instructorRequestService.deleteRequest(req.params.id);
    res.status(204).send();
  }),

  stats: asyncHandler(async (req, res) => {
    const stats = await instructorRequestService.getStats();
    res.status(200).json({
      status: 'success',
      data: stats,
    });
  }),
};
