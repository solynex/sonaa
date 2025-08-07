
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
const mongoose = require('mongoose');
const config = require('./config');
const { generateToken, authenticate, authorize } = require('./auth');
const {
    User, Role, Department, Client, Project,
    Lead, Opportunity, Invoice, InvoiceSettings
} = require('./database');

const app = express();

mongoose.connect(config.mongoUri)
    .then(() => console.log('✅ Connected to MongoDB'))
    .catch(err => {
        console.error('❌ MongoDB connection error:', err);
        process.exit(1);
    });

app.use(helmet());
app.use(cors(config.corsOptions));
app.use(express.json({ limit: '10mb' }));
// app.use(rateLimit(config.rateLimitOptions));

const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    next();
};

app.post('/api/auth/login', [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty()
], handleValidationErrors, async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email }).populate('roleId').populate('departmentId');
        
        if (!user || !(await user.comparePassword(password))) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = generateToken(user._id);
        const userData = user.toObject();
        delete userData.password;
        
        res.json({ token, user: userData });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

app.get('/api/auth/me', authenticate, (req, res) => {
    res.json({ user: req.user });
});

app.get('/api/users', authenticate, authorize('canManageTeam'), async (req, res) => {
    try {
        const users = await User.find().populate('roleId').populate('departmentId').select('-password');
        res.json(users);
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

app.post('/api/users', authenticate, authorize('canManageTeam'), [
    body('name').notEmpty().trim(),
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 6 })
], handleValidationErrors, async (req, res) => {
    try {
        const userData = req.body;
        if (userData.roleId && !mongoose.Types.ObjectId.isValid(userData.roleId)) {
            return res.status(400).json({ error: 'Invalid role ID' });
        }
        
        const user = new User(userData);
        await user.save();
        const savedUser = await User.findById(user._id).populate('roleId').populate('departmentId').select('-password');
        res.status(201).json(savedUser);
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ error: 'Email already exists' });
        }
        res.status(500).json({ error: 'Server error' });
    }
});


app.put('/api/users/:id', authenticate, async (req, res) => {
    try {
        if (req.params.id !== req.user._id.toString() && !req.permissions.canManageTeam) {
            return res.status(403).json({ error: 'Permission denied' });
        }

        const updates = { ...req.body };
        if (updates.password) {
            const bcrypt = require('bcryptjs');
            updates.password = await bcrypt.hash(updates.password, 10);
        }

        const user = await User.findByIdAndUpdate(req.params.id, updates, { new: true })
            .populate('roleId').populate('departmentId').select('-password');
        res.json(user);
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

app.get('/api/roles', authenticate, async (req, res) => {
    try {
        const roles = await Role.find().populate('departmentId');
        res.json(roles);
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

app.post('/api/roles', authenticate, authorize('canManageTeam'), [
    body('name').notEmpty().trim()
], handleValidationErrors, async (req, res) => {
    try {
        const role = new Role(req.body);
        await role.save();
        res.status(201).json(role);
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

app.put('/api/roles/:id', authenticate, authorize('canManageTeam'), async (req, res) => {
    try {
        const role = await Role.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json(role);
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

app.delete('/api/roles/:id', authenticate, authorize('canManageTeam'), async (req, res) => {
    try {
        await Role.findByIdAndDelete(req.params.id);
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

app.get('/api/departments', authenticate, async (req, res) => {
    try {
        const departments = await Department.find();
        res.json(departments);
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

app.post('/api/departments', authenticate, authorize('canManageTeam'), [
    body('name').notEmpty().trim()
], handleValidationErrors, async (req, res) => {
    try {
        const department = new Department(req.body);
        await department.save();
        res.status(201).json(department);
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

app.delete('/api/departments/:id', authenticate, authorize('canManageTeam'), async (req, res) => {
    try {
        await Department.findByIdAndDelete(req.params.id);
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

app.get('/api/clients', authenticate, async (req, res) => {
    try {
        const clients = await Client.find().populate('createdBy', 'name');
        res.json(clients);
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

app.post('/api/clients', authenticate, authorize('canAddClient'), [
    body('name').notEmpty().trim()
], handleValidationErrors, async (req, res) => {
    try {
        const client = new Client({ ...req.body, createdBy: req.user._id });
        await client.save();
        res.status(201).json(client);
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

app.get('/api/projects', authenticate, async (req, res) => {
    try {
        let query = {};
        if (!req.permissions.canSeeAllProjects) {
            query = {
                $or: [
                    { createdBy: req.user._id },
                    { 'currentStage.assignedTo': req.user._id },
                    { 'completedStages.assignedTo': req.user._id },
                    { 'workflow.assignedTo': req.user._id }
                ]
            };
        }
        const projects = await Project.find(query)
            .populate('clientId')
            .populate('createdBy', 'name')
            .populate('currentStage.assignedTo', 'name')
            .populate('completedStages.assignedTo', 'name')
            .populate('workflow.assignedTo', 'name');
        res.json(projects);
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

app.get('/api/projects/:id', authenticate, async (req, res) => {
    try {
        const project = await Project.findById(req.params.id)
            .populate('clientId')
            .populate('createdBy', 'name')
            .populate('currentStage.assignedTo', 'name')
            .populate('completedStages.assignedTo', 'name')
            .populate('workflow.assignedTo', 'name');
        
        if (!project) {
            return res.status(404).json({ error: 'Project not found' });
        }

        const hasAccess = req.permissions.canSeeAllProjects ||
            project.createdBy._id.equals(req.user._id) ||
            project.currentStage?.assignedTo?._id.equals(req.user._id) ||
            project.completedStages.some(s => s.assignedTo?._id.equals(req.user._id)) ||
            project.workflow.some(s => s.assignedTo?._id.equals(req.user._id));

        if (!hasAccess) {
            return res.status(403).json({ error: 'Access denied' });
        }

        res.json(project);
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

app.post('/api/projects', authenticate, authorize('canAddProject'), [
    body('name').notEmpty().trim(),
    body('clientId').isMongoId(),
    body('projectType').isIn(['one-time', 'subscription', 'maintenance']),
    body('projectDeadline').isISO8601()
], handleValidationErrors, async (req, res) => {
    try {
        const projectData = { ...req.body, createdBy: req.user._id };
        
        if (projectData.workflow && projectData.workflow.length > 0) {
            projectData.currentStage = projectData.workflow.shift();
            projectData.currentStage.status = 'جاري';
        }
        
        projectData.totalStages = (projectData.completedStages?.length || 0) + 
                                  (projectData.currentStage ? 1 : 0) + 
                                  (projectData.workflow?.length || 0);

        const project = new Project(projectData);
        await project.save();
        
        const savedProject = await Project.findById(project._id)
            .populate('clientId')
            .populate('currentStage.assignedTo', 'name');
        
        res.status(201).json(savedProject);
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

app.put('/api/projects/:id', authenticate, async (req, res) => {
    try {
        const project = await Project.findById(req.params.id);
        
        if (!project) {
            return res.status(404).json({ error: 'Project not found' });
        }

        if (!req.permissions.canAddProject && !project.createdBy.equals(req.user._id)) {
            return res.status(403).json({ error: 'Permission denied' });
        }

        Object.assign(project, req.body);
        await project.save();
        
        const updatedProject = await Project.findById(project._id)
            .populate('clientId')
            .populate('currentStage.assignedTo', 'name');
        
        res.json(updatedProject);
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

app.post('/api/projects/:id/submit', authenticate, async (req, res) => {
    try {
        const project = await Project.findById(req.params.id);
        
        if (!project || !project.currentStage) {
            return res.status(404).json({ error: 'Project or stage not found' });
        }

        if (!project.currentStage.assignedTo.equals(req.user._id)) {
            return res.status(403).json({ error: 'Not assigned to you' });
        }

        project.currentStage.status = 'مراجعة';
        project.currentStage.submission = req.body;
        delete project.currentStage.revisionNotes;
        
        await project.save();
        res.json(project);
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

app.post('/api/projects/:id/approve', authenticate, authorize('canApproveStages'), async (req, res) => {
    try {
        const project = await Project.findById(req.params.id);
        
        if (!project || !project.currentStage) {
            return res.status(404).json({ error: 'Project or stage not found' });
        }

        const approvedStage = { ...project.currentStage.toObject(), status: 'مكتمل', completionDate: new Date() };
        delete approvedStage.revisionNotes;
        project.completedStages.push(approvedStage);

        if (project.workflow.length > 0) {
            project.currentStage = project.workflow.shift();
            project.currentStage.status = 'جاري';
        } else {
            project.currentStage = null;
            project.status = 'مكتمل';
            project.completedDate = new Date();
        }

        await project.save();
        res.json(project);
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

app.post('/api/projects/:id/revision', authenticate, authorize('canApproveStages'), [
    body('notes').notEmpty()
], handleValidationErrors, async (req, res) => {
    try {
        const project = await Project.findById(req.params.id);
        
        if (!project || !project.currentStage) {
            return res.status(404).json({ error: 'Project or stage not found' });
        }

        project.currentStage.status = 'يحتاج تعديل';
        project.currentStage.revisionNotes = req.body.notes;
        
        await project.save();
        res.json(project);
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

app.get('/api/leads', authenticate, authorize('canManageSales'), async (req, res) => {
    try {
        const leads = await Lead.find().populate('assignedTo', 'name');
        res.json(leads);
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

app.post('/api/leads', authenticate, authorize('canManageSales'), [
    body('name').notEmpty().trim(),
    body('source').notEmpty().trim()
], handleValidationErrors, async (req, res) => {
    try {
        const lead = new Lead({ ...req.body, assignedTo: req.user._id });
        await lead.save();
        res.status(201).json(lead);
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

app.get('/api/opportunities', authenticate, authorize('canManageSales'), async (req, res) => {
    try {
        const opportunities = await Opportunity.find()
            .populate('clientId')
            .populate('assignedTo', 'name');
        res.json(opportunities);
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

app.post('/api/opportunities', authenticate, authorize('canManageSales'), [
    body('name').notEmpty().trim(),
    body('value').isNumeric(),
    body('clientId').isMongoId()
], handleValidationErrors, async (req, res) => {
    try {
        const opportunity = new Opportunity({ ...req.body, assignedTo: req.user._id });
        await opportunity.save();
        res.status(201).json(opportunity);
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

app.get('/api/invoices', authenticate, async (req, res) => {
    try {
        const invoices = await Invoice.find()
            .populate('projectId')
            .populate('clientId')
            .populate('createdBy', 'name');
        res.json(invoices);
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

app.post('/api/invoices', authenticate, authorize('canManageSales'), [
    body('projectId').isMongoId(),
    body('amount').isNumeric(),
    body('issueDate').isISO8601(),
    body('dueDate').isISO8601()
], handleValidationErrors, async (req, res) => {
    try {
        const project = await Project.findById(req.body.projectId);
        if (!project) {
            return res.status(404).json({ error: 'Project not found' });
        }

        const invoiceCount = await Invoice.countDocuments();
        const invoiceData = {
            ...req.body,
            invoiceNumber: `${new Date().getFullYear()}${String(invoiceCount + 1).padStart(3, '0')}`,
            clientId: project.clientId,
            createdBy: req.user._id
        };

        const invoice = new Invoice(invoiceData);
        await invoice.save();
        res.status(201).json(invoice);
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

app.get('/api/invoice-settings', authenticate, async (req, res) => {
    try {
        let settings = await InvoiceSettings.findOne();
        if (!settings) {
            settings = new InvoiceSettings();
            await settings.save();
        }
        res.json(settings);
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

app.put('/api/invoice-settings', authenticate, authorize('canManageTeam'), async (req, res) => {
    try {
        let settings = await InvoiceSettings.findOne();
        if (!settings) {
            settings = new InvoiceSettings(req.body);
        } else {
            Object.assign(settings, req.body);
        }
        await settings.save();
        res.json(settings);
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

app.get('/api/dashboard/stats', authenticate, async (req, res) => {
    try {
        const userId = req.user._id;
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        
        const myTasks = await Project.countDocuments({
            'currentStage.assignedTo': userId,
            status: 'جاري'
        });

        const in48Hours = new Date(now.getTime() + 48 * 60 * 60 * 1000);
        const upcomingTasks = await Project.countDocuments({
            'currentStage.assignedTo': userId,
            'currentStage.stageDeadline': { $gte: now, $lte: in48Hours },
            status: 'جاري'
        });

        const overdueTasks = await Project.countDocuments({
            'currentStage.assignedTo': userId,
            'currentStage.stageDeadline': { $lt: now },
            status: 'جاري'
        });

        const completedThisMonth = await Project.countDocuments({
            'completedStages.assignedTo': userId,
            'completedStages.completionDate': { $gte: startOfMonth }
        });

        res.json({
            myTasks,
            upcomingTasks,
            overdueTasks,
            completedThisMonth
        });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

app.get('/api/test', (req, res) => {
    res.json({ message: 'Backend is working!', timestamp: new Date() });
});

app.use((err, req, res, next) => {
    console.error('Error:', err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});

app.listen(config.port, () => {
    console.log(`✅ Server running on port ${config.port}`);
});
