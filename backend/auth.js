const jwt = require('jsonwebtoken');
const config = require('./config');
const { User, Role } = require('./database');

const generateToken = (userId) => {
    return jwt.sign({ userId }, config.jwtSecret, { expiresIn: config.jwtExpire });
};

const authenticate = async (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        if (!token) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        const decoded = jwt.verify(token, config.jwtSecret);
        const user = await User.findById(decoded.userId)
            .populate('roleId')
            .populate('departmentId')
            .select('-password');
        
        if (!user) {
            return res.status(401).json({ error: 'User not found' });
        }

        req.user = user;
        req.permissions = user.roleId?.permissions || {};
        next();
    } catch (error) {
        res.status(401).json({ error: 'Invalid token' });
    }
};

const authorize = (permission) => {
    return (req, res, next) => {
        if (!req.permissions[permission]) {
            return res.status(403).json({ error: 'Permission denied' });
        }
        next();
    };
};

module.exports = { generateToken, authenticate, authorize };
