const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const config = require('./config');

mongoose.connect(config.mongoUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

const UserSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true },
    avatar: String,
    roleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Role' },
    departmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' },
    createdAt: { type: Date, default: Date.now }
});

UserSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next();
    this.password = await bcrypt.hash(this.password, 10);
    next();
});

UserSchema.methods.comparePassword = async function(password) {
    return await bcrypt.compare(password, this.password);
};

const RoleSchema = new mongoose.Schema({
    name: { type: String, required: true },
    departmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' },
    permissions: {
        canSeeAllProjects: { type: Boolean, default: false },
        canAddProject: { type: Boolean, default: false },
        canAddClient: { type: Boolean, default: false },
        canApproveStages: { type: Boolean, default: false },
        canManageTeam: { type: Boolean, default: false },
        canSeeReports: { type: Boolean, default: false },
        canManageSales: { type: Boolean, default: false }
    }
});

const DepartmentSchema = new mongoose.Schema({
    name: { type: String, required: true }
});

const ClientSchema = new mongoose.Schema({
    name: { type: String, required: true },
    contact: String,
    communicationLog: [{
        date: Date,
        type: String,
        notes: String,
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
    }],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdAt: { type: Date, default: Date.now }
});

const ProjectStageSchema = new mongoose.Schema({
    name: { type: String, required: true },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    stageDeadline: Date,
    status: { type: String, enum: ['جاري', 'مكتمل', 'مراجعة', 'يحتاج تعديل'], default: 'جاري' },
    completionDate: Date,
    submission: {
        comment: String,
        file: String
    },
    revisionNotes: String
});

const ProjectSchema = new mongoose.Schema({
    name: { type: String, required: true },
    clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
    projectType: { type: String, enum: ['one-time', 'subscription', 'maintenance'], required: true },
    projectDeadline: { type: Date, required: true },
    projectDescription: String,
    status: { type: String, enum: ['جاري', 'مكتمل', 'متأخر'], default: 'جاري' },
    totalStages: Number,
    completedStages: [ProjectStageSchema],
    currentStage: ProjectStageSchema,
    workflow: [ProjectStageSchema],
    completedDate: Date,
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdAt: { type: Date, default: Date.now }
});

const LeadSchema = new mongoose.Schema({
    name: { type: String, required: true },
    source: { type: String, required: true },
    notes: String,
    status: { type: String, enum: ['new', 'contacted', 'qualified', 'lost'], default: 'new' },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdAt: { type: Date, default: Date.now }
});

const OpportunitySchema = new mongoose.Schema({
    name: { type: String, required: true },
    clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client' },
    value: { type: Number, required: true },
    stage: { type: String, enum: ['prospecting', 'proposal', 'negotiation', 'won', 'lost'], default: 'prospecting' },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdAt: { type: Date, default: Date.now }
});

const InvoiceSchema = new mongoose.Schema({
    invoiceNumber: { type: String, unique: true },
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
    clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client' },
    amount: { type: Number, required: true },
    issueDate: { type: Date, required: true },
    dueDate: { type: Date, required: true },
    status: { type: String, enum: ['draft', 'sent', 'paid', 'overdue'], default: 'draft' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdAt: { type: Date, default: Date.now }
});

const InvoiceSettingsSchema = new mongoose.Schema({
    companyName: String,
    companyAddress: String,
    companyExtra: String,
    companyLogo: String
});

module.exports = {
    User: mongoose.model('User', UserSchema),
    Role: mongoose.model('Role', RoleSchema),
    Department: mongoose.model('Department', DepartmentSchema),
    Client: mongoose.model('Client', ClientSchema),
    Project: mongoose.model('Project', ProjectSchema),
    Lead: mongoose.model('Lead', LeadSchema),
    Opportunity: mongoose.model('Opportunity', OpportunitySchema),
    Invoice: mongoose.model('Invoice', InvoiceSchema),
    InvoiceSettings: mongoose.model('InvoiceSettings', InvoiceSettingsSchema)
};
