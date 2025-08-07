const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

mongoose.connect('mongodb://localhost:27017/sonaa_crm');

const RoleSchema = new mongoose.Schema({
    name: String,
    permissions: {
        canSeeAllProjects: Boolean,
        canAddProject: Boolean,
        canAddClient: Boolean,
        canApproveStages: Boolean,
        canManageTeam: Boolean,
        canSeeReports: Boolean,
        canManageSales: Boolean
    }
});

const UserSchema = new mongoose.Schema({
    name: String,
    email: String,
    password: String,
    roleId: mongoose.Schema.Types.ObjectId
});

UserSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next();
    this.password = await bcrypt.hash(this.password, 10);
    next();
});

const Role = mongoose.model('Role', RoleSchema);
const User = mongoose.model('User', UserSchema);

async function seed() {
    const adminRole = await Role.create({
        name: 'Admin',
        permissions: {
            canSeeAllProjects: true,
            canAddProject: true,
            canAddClient: true,
            canApproveStages: true,
            canManageTeam: true,
            canSeeReports: true,
            canManageSales: true
        }
    });
    
    await User.create({
        name: 'أحمد محمد',
        email: 'admin@sonaa.com',
        password: '123',
        roleId: adminRole._id
    });
    
    console.log('✅ Admin user created!');
    console.log('📧 Email: admin@sonaa.com');
    console.log('🔑 Password: 123');
    process.exit(0);
}

seed();
