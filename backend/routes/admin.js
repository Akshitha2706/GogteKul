import express from 'express';
import jwt from 'jsonwebtoken';
import { verifyToken, requireAdmin, requireAdminOrDBA } from '../middleware/auth.js';
import User from '../models/mongoose/User.js';
import FamilyMember from '../models/mongoose/FamilyMember.js';
import News from '../models/mongoose/News.js';
import Event from '../models/mongoose/Event.js';
import Relationship from '../models/mongoose/Relationship.js';
import HierarchyForm from '../models/mongoose/HierarchyForm.js';
import TempMember from '../models/mongoose/TempMember.js';
import LegacyLogin from '../models/mongoose/LegacyLogin.js';
import LegacyLoginCap from '../models/mongoose/LegacyLoginCap.js';
import bcrypt from 'bcryptjs';

const router = express.Router();

const resolveUniqueSerNo = async (candidate) => {
  const parsedCandidate = candidate !== undefined && candidate !== null ? Number(candidate) : null;
  if (parsedCandidate !== null && !Number.isNaN(parsedCandidate)) {
    const existing = await FamilyMember.findOne({ serNo: parsedCandidate });
    if (!existing) {
      return parsedCandidate;
    }
  }
  const latest = await FamilyMember.findOne({ serNo: { $ne: null } }).sort({ serNo: -1 }).select('serNo').lean();
  if (latest && latest.serNo !== undefined && latest.serNo !== null) {
    const latestValue = Number(latest.serNo);
    if (!Number.isNaN(latestValue)) {
      return latestValue + 1;
    }
  }
  return 1;
};

// ============ LOGIN ENDPOINT ============
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    if (user.role !== 'admin') {
      return res.status(403).json({ message: 'Only admins can access this endpoint' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Login failed', error: error.message });
  }
});

// ============ STATS ENDPOINT ============
router.get('/stats', verifyToken, requireAdmin, async (req, res) => {
  try {
    const stats = {
      totalUsers: await User.countDocuments(),
      totalMembers: await FamilyMember.countDocuments(),
      totalFamilyMembers: await FamilyMember.countDocuments(),
      totalNews: await News.countDocuments(),
      totalEvents: await Event.countDocuments(),
      totalRelationships: await Relationship.countDocuments(),
      pendingForms: await HierarchyForm.countDocuments({ status: 'pending' }),
      pendingHierarchyForms: await HierarchyForm.countDocuments({ status: 'pending' }),
      tempMembers: await TempMember.countDocuments({ status: 'pending' }),
      pendingTempMembers: await TempMember.countDocuments({ status: 'pending' }),
      totalLoginDetails: await LegacyLogin.countDocuments(),
    };
    res.json(stats);
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ message: 'Error fetching stats', error: error.message });
  }
});

// ============ USERS ROUTES ============

// Get all users
router.get('/users', verifyToken, requireAdmin, async (req, res) => {
  try {
    const users = await User.find().select('-password');
    res.json(users);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ message: 'Error fetching users', error: error.message });
  }
});

// Create user
router.post('/users', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { firstName, lastName, email, password, phone, dateOfBirth, gender, role, isActive } = req.body;
    
    let hashedPassword = password;
    if (password) {
      const salt = await bcrypt.genSalt(10);
      hashedPassword = await bcrypt.hash(password, salt);
    }

    const user = new User({
      firstName,
      lastName,
      email: email?.toLowerCase(),
      password: hashedPassword,
      phone,
      dateOfBirth,
      gender,
      role: role || 'user',
      isActive: isActive !== false,
    });

    await user.save();
    res.status(201).json({ message: 'User created', user });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ message: 'Error creating user', error: error.message });
  }
});

// Update user
router.put('/users/:id', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { password, ...updateData } = req.body;

    if (password) {
      const salt = await bcrypt.genSalt(10);
      updateData.password = await bcrypt.hash(password, salt);
    }

    const user = await User.findByIdAndUpdate(id, updateData, { new: true }).select('-password');
    res.json({ message: 'User updated', user });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ message: 'Error updating user', error: error.message });
  }
});

// Delete user
router.delete('/users/:id', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await User.findByIdAndDelete(id);
    res.json({ message: 'User deleted' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ message: 'Error deleting user', error: error.message });
  }
});

// ============ FAMILY MEMBERS ROUTES ============

// Get all family members
router.get('/family-members', verifyToken, requireAdmin, async (req, res) => {
  try {
    const members = await FamilyMember.find();
    res.json(members);
  } catch (error) {
    console.error('Get family members error:', error);
    res.status(500).json({ message: 'Error fetching family members', error: error.message });
  }
});

// Create family member
router.post('/family-members', verifyToken, requireAdmin, async (req, res) => {
  try {
    const member = new FamilyMember(req.body);
    await member.save();
    res.status(201).json({ message: 'Family member created', member });
  } catch (error) {
    console.error('Create family member error:', error);
    res.status(500).json({ message: 'Error creating family member', error: error.message });
  }
});

// Update family member
router.put('/family-members/:id', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const member = await FamilyMember.findByIdAndUpdate(id, req.body, { new: true });
    res.json({ message: 'Family member updated', member });
  } catch (error) {
    console.error('Update family member error:', error);
    res.status(500).json({ message: 'Error updating family member', error: error.message });
  }
});

// Delete family member
router.delete('/family-members/:id', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await FamilyMember.findByIdAndDelete(id);
    res.json({ message: 'Family member deleted' });
  } catch (error) {
    console.error('Delete family member error:', error);
    res.status(500).json({ message: 'Error deleting family member', error: error.message });
  }
});

// ============ NEWS ROUTES ============

// Get all news
router.get('/news', verifyToken, requireAdmin, async (req, res) => {
  try {
    const news = await News.find();
    res.json(news);
  } catch (error) {
    console.error('Get news error:', error);
    res.status(500).json({ message: 'Error fetching news', error: error.message });
  }
});

// Create news
router.post('/news', verifyToken, requireAdmin, async (req, res) => {
  try {
    const newsArticle = new News(req.body);
    newsArticle.createdBy = req.user.id;
    await newsArticle.save();
    res.status(201).json({ message: 'News created', news: newsArticle });
  } catch (error) {
    console.error('Create news error:', error);
    res.status(500).json({ message: 'Error creating news', error: error.message });
  }
});

// Update news
router.put('/news/:id', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const news = await News.findByIdAndUpdate(id, req.body, { new: true });
    res.json({ message: 'News updated', news });
  } catch (error) {
    console.error('Update news error:', error);
    res.status(500).json({ message: 'Error updating news', error: error.message });
  }
});

// Delete news
router.delete('/news/:id', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await News.findByIdAndDelete(id);
    res.json({ message: 'News deleted' });
  } catch (error) {
    console.error('Delete news error:', error);
    res.status(500).json({ message: 'Error deleting news', error: error.message });
  }
});

// ============ EVENTS ROUTES ============

// Get all events
router.get('/events', verifyToken, requireAdmin, async (req, res) => {
  try {
    const events = await Event.find();
    res.json(events);
  } catch (error) {
    console.error('Get events error:', error);
    res.status(500).json({ message: 'Error fetching events', error: error.message });
  }
});

// Create event
router.post('/events', verifyToken, requireAdmin, async (req, res) => {
  try {
    const event = new Event(req.body);
    event.createdBy = req.user.id;
    await event.save();
    res.status(201).json({ message: 'Event created', event });
  } catch (error) {
    console.error('Create event error:', error);
    res.status(500).json({ message: 'Error creating event', error: error.message });
  }
});

// Update event
router.put('/events/:id', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const event = await Event.findByIdAndUpdate(id, req.body, { new: true });
    res.json({ message: 'Event updated', event });
  } catch (error) {
    console.error('Update event error:', error);
    res.status(500).json({ message: 'Error updating event', error: error.message });
  }
});

// Delete event
router.delete('/events/:id', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await Event.findByIdAndDelete(id);
    res.json({ message: 'Event deleted' });
  } catch (error) {
    console.error('Delete event error:', error);
    res.status(500).json({ message: 'Error deleting event', error: error.message });
  }
});

// ============ RELATIONSHIPS ROUTES ============

// Get all relationships
router.get('/relationships', verifyToken, requireAdmin, async (req, res) => {
  try {
    const relationships = await Relationship.find();
    res.json(relationships);
  } catch (error) {
    console.error('Get relationships error:', error);
    res.status(500).json({ message: 'Error fetching relationships', error: error.message });
  }
});

// Create relationship
router.post('/relationships', verifyToken, requireAdmin, async (req, res) => {
  try {
    const relationship = new Relationship(req.body);
    await relationship.save();
    res.status(201).json({ message: 'Relationship created', relationship });
  } catch (error) {
    console.error('Create relationship error:', error);
    res.status(500).json({ message: 'Error creating relationship', error: error.message });
  }
});

// Delete relationship
router.delete('/relationships/:id', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await Relationship.findByIdAndDelete(id);
    res.json({ message: 'Relationship deleted' });
  } catch (error) {
    console.error('Delete relationship error:', error);
    res.status(500).json({ message: 'Error deleting relationship', error: error.message });
  }
});

// Update relationship
router.put('/relationships/:id', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const relationship = await Relationship.findByIdAndUpdate(id, req.body, { new: true });
    res.json({ message: 'Relationship updated', relationship });
  } catch (error) {
    console.error('Update relationship error:', error);
    res.status(500).json({ message: 'Error updating relationship', error: error.message });
  }
});

// ============ HIERARCHY FORMS ROUTES ============

// Get all hierarchy forms
router.get('/hierarchy-forms', verifyToken, requireAdmin, async (req, res) => {
  try {
    const forms = await HierarchyForm.find();
    res.json(forms);
  } catch (error) {
    console.error('Get hierarchy forms error:', error);
    res.status(500).json({ message: 'Error fetching hierarchy forms', error: error.message });
  }
});

// Create hierarchy form
router.post('/hierarchy-forms', verifyToken, async (req, res) => {
  try {
    const form = new HierarchyForm(req.body);
    form.submittedBy = req.user.id;
    await form.save();
    res.status(201).json({ message: 'Hierarchy form submitted', form });
  } catch (error) {
    console.error('Create hierarchy form error:', error);
    res.status(500).json({ message: 'Error submitting hierarchy form', error: error.message });
  }
});

// Update hierarchy form (admin only for approval)
router.put('/hierarchy-forms/:id', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, approvalComments } = req.body;

    const updateData = {
      status,
      approvalComments,
    };

    if (status === 'approved') {
      updateData.isApproved = true;
      updateData.approvedBy = req.user.id;
      updateData.approvedAt = new Date();
    }

    const form = await HierarchyForm.findByIdAndUpdate(id, updateData, { new: true });
    res.json({ message: 'Hierarchy form updated', form });
  } catch (error) {
    console.error('Update hierarchy form error:', error);
    res.status(500).json({ message: 'Error updating hierarchy form', error: error.message });
  }
});

// Delete hierarchy form
router.delete('/hierarchy-forms/:id', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await HierarchyForm.findByIdAndDelete(id);
    res.json({ message: 'Hierarchy form deleted' });
  } catch (error) {
    console.error('Delete hierarchy form error:', error);
    res.status(500).json({ message: 'Error deleting hierarchy form', error: error.message });
  }
});

// Approve hierarchy form - Move from Heirarchy_form → members collection and create login entry
router.put('/hierarchy-forms/:id/approve', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get the hierarchy form
    const form = await HierarchyForm.findById(id);
    if (!form) {
      return res.status(404).json({ message: 'Hierarchy form not found' });
    }

    if (form.status === 'approved') {
      return res.status(400).json({ message: 'This form is already approved' });
    }

    // Extract form data and create FamilyMember record
    const formData = form.formData || {};
    const familyMemberData = {
      serNo: formData.serNo,
      firstName: formData.firstName || form.primaryMemberName,
      middleName: formData.middleName,
      lastName: formData.lastName,
      gender: formData.gender,
      dateOfBirth: formData.dateOfBirth,
      dateOfMarriage: formData.dateOfMarriage,
      dateOfDeath: formData.dateOfDeath,
      isAlive: formData.isAlive !== false,
      profilePicture: formData.profilePicture,
      email: formData.email,
      phoneNumber: formData.phoneNumber,
      occupation: formData.occupation,
      maritalStatus: formData.maritalStatus,
      education: formData.education,
      address: formData.address || {},
      biography: formData.biography,
      vanshNumber: formData.vanshNumber,
      bloodGroup: formData.bloodGroup,
      notes: formData.notes,
      createdBy: req.user.id,
      createdByName: 'Admin',
    };

    // Create FamilyMember record
    const familyMember = new FamilyMember(familyMemberData);
    await familyMember.save();

    // Create User (login) entry if email exists
    if (formData.email) {
      const existingUser = await User.findOne({ email: formData.email });
      if (!existingUser) {
        // Generate a temporary password
        const tempPassword = Math.random().toString(36).slice(-10);
        const hashedPassword = await bcrypt.hash(tempPassword, 10);
        
        const userData = new User({
          firstName: formData.firstName || form.primaryMemberName,
          lastName: formData.lastName || '',
          email: formData.email,
          password: hashedPassword,
          phone: formData.phoneNumber,
          dateOfBirth: formData.dateOfBirth,
          gender: formData.gender,
          profilePicture: formData.profilePicture,
          occupation: formData.occupation,
          maritalStatus: formData.maritalStatus,
          address: formData.address || {},
          role: 'user',
          isAdmin: false,
          isActive: true,
        });
        await userData.save();
      }
    }

    // Mark form as approved
    form.status = 'approved';
    form.isApproved = true;
    form.approvedBy = req.user.id;
    form.approvalComments = req.body.approvalComments || '';
    form.approvedAt = new Date();
    await form.save();

    // Delete from Heirarchy_form collection
    await HierarchyForm.findByIdAndDelete(id);

    res.json({
      message: 'Hierarchy form approved and moved to members',
      form,
      familyMember: { id: familyMember._id },
      userCreated: formData.email ? true : false,
    });
  } catch (error) {
    console.error('Approve hierarchy form error:', error);
    res.status(500).json({ message: 'Error approving hierarchy form', error: error.message });
  }
});

// ============ TEMP MEMBERS ROUTES ============

// Get all temp members
router.get('/temp-members', verifyToken, requireAdmin, async (req, res) => {
  try {
    const members = await TempMember.find();
    res.json(members);
  } catch (error) {
    console.error('Get temp members error:', error);
    res.status(500).json({ message: 'Error fetching temp members', error: error.message });
  }
});

// Create temp member
router.post('/temp-members', verifyToken, async (req, res) => {
  try {
    const member = new TempMember(req.body);
    member.submittedBy = req.user.id;
    await member.save();
    res.status(201).json({ message: 'Temp member submitted', member });
  } catch (error) {
    console.error('Create temp member error:', error);
    res.status(500).json({ message: 'Error submitting temp member', error: error.message });
  }
});

// Update temp member (admin approval)
router.put('/temp-members/:id', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, approvalComments } = req.body;

    const updateData = {
      status,
      approvalComments,
    };

    if (status === 'approved') {
      updateData.isApproved = true;
      updateData.approvedBy = req.user.id;
    }

    const member = await TempMember.findByIdAndUpdate(id, updateData, { new: true });
    res.json({ message: 'Temp member updated', member });
  } catch (error) {
    console.error('Update temp member error:', error);
    res.status(500).json({ message: 'Error updating temp member', error: error.message });
  }
});

// Delete temp member
router.delete('/temp-members/:id', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await TempMember.findByIdAndDelete(id);
    res.json({ message: 'Temp member deleted' });
  } catch (error) {
    console.error('Delete temp member error:', error);
    res.status(500).json({ message: 'Error deleting temp member', error: error.message });
  }
});

// Approve temp member - Move from temp collection → members collection and create login entry
router.put('/temp-members/:id/approve', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get the temp member
    const tempMember = await TempMember.findById(id);
    if (!tempMember) {
      return res.status(404).json({ message: 'Temp member not found' });
    }

    if (tempMember.status === 'approved') {
      return res.status(400).json({ message: 'This member is already approved' });
    }

    // Get admin user details for audit trail
    const adminUser = await User.findById(req.user.id);
    const adminName = adminUser ? `${adminUser.firstName} ${adminUser.lastName}` : 'Admin';

    // Create FamilyMember record from temp member data
    const familyMemberData = {
      serNo: tempMember.serNo,
      firstName: tempMember.firstName,
      middleName: tempMember.middleName,
      lastName: tempMember.lastName,
      gender: tempMember.gender,
      dateOfBirth: tempMember.dateOfBirth,
      dateOfMarriage: tempMember.spouseInfo?.marriageDate,
      isAlive: true,
      profilePicture: tempMember.profilePicture,
      email: tempMember.email,
      phoneNumber: tempMember.phoneNumber,
      occupation: tempMember.occupation,
      maritalStatus: tempMember.maritalStatus,
      address: tempMember.address || {},
      notes: tempMember.notes,
      createdBy: req.user.id,
      createdByName: adminName,
    };

    // Create FamilyMember record
    const familyMember = new FamilyMember(familyMemberData);
    await familyMember.save();

    // Create User (login) entry if email exists
    if (tempMember.email) {
      const existingUser = await User.findOne({ email: tempMember.email });
      if (!existingUser) {
        // Generate a temporary password
        const tempPassword = Math.random().toString(36).slice(-10);
        const hashedPassword = await bcrypt.hash(tempPassword, 10);
        
        const userData = new User({
          firstName: tempMember.firstName,
          lastName: tempMember.lastName || '',
          email: tempMember.email,
          password: hashedPassword,
          phone: tempMember.phoneNumber,
          dateOfBirth: tempMember.dateOfBirth,
          gender: tempMember.gender,
          profilePicture: tempMember.profilePicture,
          occupation: tempMember.occupation,
          maritalStatus: tempMember.maritalStatus,
          address: tempMember.address || {},
          role: 'user',
          isAdmin: false,
          isActive: true,
        });
        await userData.save();
      }
    }

    // Mark temp member as approved
    tempMember.status = 'approved';
    tempMember.isApproved = true;
    tempMember.approvedBy = req.user.id;
    tempMember.approvalComments = req.body.approvalComments || '';
    await tempMember.save();

    // Delete from temp members collection
    await TempMember.findByIdAndDelete(id);

    res.json({
      message: 'Temp member approved and moved to members',
      tempMember,
      familyMember: { id: familyMember._id },
      userCreated: tempMember.email ? true : false,
    });
  } catch (error) {
    console.error('Approve temp member error:', error);
    res.status(500).json({ message: 'Error approving temp member', error: error.message });
  }
});

// ============ LOGIN DETAILS ROUTES ============

// Get all login details
router.get('/login-details', verifyToken, requireAdmin, async (req, res) => {
  try {
    const loginDetails = await LegacyLogin.find();
    const loginDetailsCapital = await LegacyLoginCap.find();
    res.json([...loginDetails, ...loginDetailsCapital]);
  } catch (error) {
    console.error('Get login details error:', error);
    res.status(500).json({ message: 'Error fetching login details', error: error.message });
  }
});

// Create login detail
router.post('/login-details', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { email, username, password, firstName, lastName, serNo } = req.body;

    const loginDetail = new LegacyLogin({
      email: email?.toLowerCase(),
      username: username?.toLowerCase(),
      password,
      firstName,
      lastName,
      serNo,
    });

    await loginDetail.save();
    res.status(201).json({ message: 'Login detail created', loginDetail });
  } catch (error) {
    console.error('Create login detail error:', error);
    res.status(500).json({ message: 'Error creating login detail', error: error.message });
  }
});

// Update login detail
router.put('/login-details/:id', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const loginDetail = await LegacyLogin.findByIdAndUpdate(id, req.body, { new: true });
    res.json({ message: 'Login detail updated', loginDetail });
  } catch (error) {
    console.error('Update login detail error:', error);
    res.status(500).json({ message: 'Error updating login detail', error: error.message });
  }
});

// Delete login detail
router.delete('/login-details/:id', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await LegacyLogin.findByIdAndDelete(id);
    res.json({ message: 'Login detail deleted' });
  } catch (error) {
    console.error('Delete login detail error:', error);
    res.status(500).json({ message: 'Error deleting login detail', error: error.message });
  }
});

export default router;