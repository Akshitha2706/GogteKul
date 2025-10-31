import express from 'express';
import bcrypt from 'bcryptjs';
import Fami from '../models/Fami.js';
import Member from '../models/Member.js';
import Login from '../models/Login.js';
import News from '../models/News.js';
import Event from '../models/Event.js';
import { verifyToken, requireAdmin } from '../middleware/auth.js';
import mongoose from 'mongoose';

const router = express.Router();

// Apply middleware to all routes
router.use(verifyToken, requireAdmin);

// ==================== HIERARCHY FORM / PENDING REGISTRATIONS ====================

/**
 * GET /api/adminV2/hierarchy-forms
 * Get all pending registrations (default) or all with filters
 */
router.get('/hierarchy-forms', async (req, res) => {
  try {
    const { status = 'pending', page = 1, limit = 10 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const query = status ? { status } : {};
    const forms = await Fami.find(query)
      .sort({ submittedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Fami.countDocuments(query);

    res.json({
      success: true,
      data: forms,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/adminV2/hierarchy-forms/:id
 * Get single form by ID
 */
router.get('/hierarchy-forms/:id', async (req, res) => {
  try {
    const form = await Fami.findById(req.params.id);
    if (!form) {
      return res.status(404).json({ success: false, message: 'Form not found' });
    }
    res.json({ success: true, data: form });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/adminV2/hierarchy-forms/:id/approve
 * Approve pending registration
 * Flow: 1. Create member, 2. Create login entry, 3. Update hierarchy_form status, 4. Delete hierarchy_form
 */
router.post('/hierarchy-forms/:id/approve', async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { userName, password } = req.body;

    if (!userName || !password) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: 'userName and password are required',
      });
    }

    // Find the hierarchy form
    const hierarchyForm = await Fami.findById(req.params.id).session(session);
    if (!hierarchyForm) {
      await session.abortTransaction();
      return res.status(404).json({ success: false, message: 'Form not found' });
    }

    // Get the next available serNo
    const lastMember = await Member.findOne()
      .sort({ serNo: -1 })
      .session(session);
    const nextSerNo = (lastMember?.serNo || 0) + 1;

    // 1. Create member
    const memberData = {
      serNo: nextSerNo,
      name: hierarchyForm.name,
      gender: hierarchyForm.gender,
      dateOfBirth: hierarchyForm.dateOfBirth,
      address: hierarchyForm.address,
      phone: hierarchyForm.phone,
      email: hierarchyForm.email,
      approvalDate: new Date(),
      approvedBy: req.user.id,
      hierarchyFormId: hierarchyForm._id,
    };

    const member = await Member.create([memberData], { session });

    // 2. Hash password and create login entry
    const hashedPassword = await bcrypt.hash(password, 10);
    const loginData = {
      serNo: nextSerNo,
      userName: userName.toLowerCase(),
      password: hashedPassword,
      role: 'user',
      memberId: member[0]._id,
      isActive: true,
    };

    await Login.create([loginData], { session });

    // 3. Update hierarchy form status
    hierarchyForm.status = 'approved';
    hierarchyForm.reviewedAt = new Date();
    hierarchyForm.reviewedBy = req.user.id;
    await hierarchyForm.save({ session });

    await session.commitTransaction();

    res.json({
      success: true,
      message: 'Registration approved successfully',
      data: {
        member: member[0],
        credentials: {
          serNo: nextSerNo,
          userName,
          password: '***', // Don't return password to client
        },
      },
    });
  } catch (error) {
    await session.abortTransaction();
    res.status(500).json({ success: false, message: error.message });
  } finally {
    session.endSession();
  }
});

/**
 * POST /api/adminV2/hierarchy-forms/:id/reject
 * Reject pending registration
 */
router.post('/hierarchy-forms/:id/reject', async (req, res) => {
  try {
    const { rejectionReason } = req.body;

    const hierarchyForm = await Fami.findById(req.params.id);
    if (!hierarchyForm) {
      return res.status(404).json({ success: false, message: 'Form not found' });
    }

    hierarchyForm.status = 'rejected';
    hierarchyForm.reviewedAt = new Date();
    hierarchyForm.reviewedBy = req.user.id;
    hierarchyForm.rejectionReason = rejectionReason || '';

    await hierarchyForm.save();

    res.json({
      success: true,
      message: 'Registration rejected',
      data: hierarchyForm,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==================== MEMBERS ====================

/**
 * GET /api/adminV2/members
 * Get all members with pagination
 */
router.get('/members', async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '' } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const query = search
      ? { $or: [{ name: { $regex: search, $options: 'i' } }, { email: { $regex: search, $options: 'i' } }] }
      : {};

    const members = await Member.find(query)
      .sort({ serNo: 1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Member.countDocuments(query);

    res.json({
      success: true,
      data: members,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/adminV2/members/:id
 * Get single member by ID
 */
router.get('/members/:id', async (req, res) => {
  try {
    const member = await Member.findById(req.params.id).populate('approvedBy');
    if (!member) {
      return res.status(404).json({ success: false, message: 'Member not found' });
    }
    res.json({ success: true, data: member });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * PUT /api/adminV2/members/:id
 * Update member details
 */
router.put('/members/:id', async (req, res) => {
  try {
    const { name, gender, dateOfBirth, address, phone, email } = req.body;

    const member = await Member.findByIdAndUpdate(
      req.params.id,
      {
        name,
        gender,
        dateOfBirth,
        address,
        phone,
        email,
      },
      { new: true, runValidators: true }
    );

    if (!member) {
      return res.status(404).json({ success: false, message: 'Member not found' });
    }

    res.json({ success: true, data: member });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * DELETE /api/adminV2/members/:id
 * Delete member (soft delete recommended)
 */
router.delete('/members/:id', async (req, res) => {
  try {
    const member = await Member.findByIdAndDelete(req.params.id);
    if (!member) {
      return res.status(404).json({ success: false, message: 'Member not found' });
    }

    // Also delete associated login entry
    await Login.findOneAndDelete({ serNo: member.serNo });

    res.json({ success: true, message: 'Member deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==================== LOGIN / CREDENTIALS ====================

/**
 * GET /api/adminV2/logins
 * Get all login records with pagination
 */
router.get('/logins', async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '' } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const query = search ? { userName: { $regex: search, $options: 'i' } } : {};

    const logins = await Login.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .select('-password'); // Don't return password

    const total = await Login.countDocuments(query);

    res.json({
      success: true,
      data: logins,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/adminV2/logins/:id
 * Get single login record by ID
 */
router.get('/logins/:id', async (req, res) => {
  try {
    const login = await Login.findById(req.params.id).select('-password');
    if (!login) {
      return res.status(404).json({ success: false, message: 'Login record not found' });
    }
    res.json({ success: true, data: login });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * PUT /api/adminV2/logins/:id/reset-password
 * Reset user password
 */
router.put('/logins/:id/reset-password', async (req, res) => {
  try {
    const { newPassword } = req.body;

    if (!newPassword) {
      return res.status(400).json({ success: false, message: 'newPassword is required' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    const login = await Login.findByIdAndUpdate(
      req.params.id,
      { password: hashedPassword, loginAttempts: 0 },
      { new: true }
    ).select('-password');

    if (!login) {
      return res.status(404).json({ success: false, message: 'Login record not found' });
    }

    res.json({
      success: true,
      message: 'Password reset successfully',
      data: login,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * PUT /api/adminV2/logins/:id/toggle-status
 * Enable/disable login account
 */
router.put('/logins/:id/toggle-status', async (req, res) => {
  try {
    const login = await Login.findById(req.params.id);
    if (!login) {
      return res.status(404).json({ success: false, message: 'Login record not found' });
    }

    login.isActive = !login.isActive;
    await login.save();

    res.json({
      success: true,
      message: `Account ${login.isActive ? 'enabled' : 'disabled'} successfully`,
      data: login,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==================== NEWS ====================

/**
 * GET /api/adminV2/news
 * Get all news with pagination
 */
router.get('/news', async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', category = '' } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const query = {};
    if (search) query.title = { $regex: search, $options: 'i' };
    if (category) query.category = category;

    const news = await News.find(query)
      .sort({ datePosted: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await News.countDocuments(query);

    res.json({
      success: true,
      data: news,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/adminV2/news
 * Create new news article
 */
router.post('/news', async (req, res) => {
  try {
    const { title, content, summary, category, priority, tags, images } = req.body;

    const newsData = {
      title,
      content,
      summary,
      category,
      priority,
      tags: tags || [],
      images: images || {},
      authorSerNo: req.user.serNo,
      authorName: req.user.name || req.user.userName,
      datePosted: new Date(),
      isPublished: true,
    };

    const newsArticle = await News.create(newsData);

    res.status(201).json({
      success: true,
      message: 'News article created successfully',
      data: newsArticle,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/adminV2/news/:id
 * Get single news article
 */
router.get('/news/:id', async (req, res) => {
  try {
    const news = await News.findById(req.params.id);
    if (!news) {
      return res.status(404).json({ success: false, message: 'News article not found' });
    }
    res.json({ success: true, data: news });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * PUT /api/adminV2/news/:id
 * Update news article
 */
router.put('/news/:id', async (req, res) => {
  try {
    const { title, content, summary, category, priority, tags, images, isPublished } = req.body;

    const news = await News.findByIdAndUpdate(
      req.params.id,
      {
        title,
        content,
        summary,
        category,
        priority,
        tags,
        images,
        isPublished,
      },
      { new: true, runValidators: true }
    );

    if (!news) {
      return res.status(404).json({ success: false, message: 'News article not found' });
    }

    res.json({ success: true, data: news });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * DELETE /api/adminV2/news/:id
 * Delete news article
 */
router.delete('/news/:id', async (req, res) => {
  try {
    const news = await News.findByIdAndDelete(req.params.id);
    if (!news) {
      return res.status(404).json({ success: false, message: 'News article not found' });
    }
    res.json({ success: true, message: 'News article deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==================== EVENTS ====================

/**
 * GET /api/adminV2/events
 * Get all events with pagination
 */
router.get('/events', async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', eventType = '' } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const query = {};
    if (search) query.title = { $regex: search, $options: 'i' };
    if (eventType) query.eventType = eventType;

    const events = await Event.find(query)
      .sort({ date: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Event.countDocuments(query);

    res.json({
      success: true,
      data: events,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/adminV2/events
 * Create new event
 */
router.post('/events', async (req, res) => {
  try {
    const { title, description, location, date, eventType, priority, eventImage } = req.body;

    const eventData = {
      title,
      eventName: title,
      description,
      location,
      venue: location,
      date,
      eventType,
      priority: priority || 'Medium',
      eventImage,
      createdBy: req.user.id,
      createdBySerNo: req.user.serNo,
      createdByName: req.user.name || req.user.userName,
      visibleToAllVansh: true,
    };

    const event = await Event.create(eventData);

    res.status(201).json({
      success: true,
      message: 'Event created successfully',
      data: event,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/adminV2/events/:id
 * Get single event
 */
router.get('/events/:id', async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }
    res.json({ success: true, data: event });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * PUT /api/adminV2/events/:id
 * Update event
 */
router.put('/events/:id', async (req, res) => {
  try {
    const { title, description, location, date, eventType, priority, eventImage } = req.body;

    const event = await Event.findByIdAndUpdate(
      req.params.id,
      {
        title,
        eventName: title,
        description,
        location,
        venue: location,
        date,
        eventType,
        priority,
        eventImage,
      },
      { new: true, runValidators: true }
    );

    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    res.json({ success: true, data: event });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * DELETE /api/adminV2/events/:id
 * Delete event
 */
router.delete('/events/:id', async (req, res) => {
  try {
    const event = await Event.findByIdAndDelete(req.params.id);
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }
    res.json({ success: true, message: 'Event deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==================== STATS / DASHBOARD ====================

/**
 * GET /api/adminV2/stats
 * Get admin dashboard statistics
 */
router.get('/stats', async (req, res) => {
  try {
    const totalPending = await Fami.countDocuments({ status: 'pending' });
    const totalMembers = await Member.countDocuments();
    const totalNews = await News.countDocuments();
    const totalEvents = await Event.countDocuments();
    const totalUsers = await Login.countDocuments();

    res.json({
      success: true,
      data: {
        pendingRegistrations: totalPending,
        totalMembers,
        totalNews,
        totalEvents,
        totalUsers,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;