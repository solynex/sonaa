require('dotenv').config();

module.exports = {
    port: process.env.PORT || 5000,
    mongoUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/sonaa_crm',
    jwtSecret: process.env.JWT_SECRET || 'default_secret_change_this',
    jwtExpire: process.env.JWT_EXPIRE || '30d',
    nodeEnv: process.env.NODE_ENV || 'development',
    corsOptions: {
        origin: ['http://localhost:5500', 'http://127.0.0.1:5500', 'http://localhost:3000'],
        credentials: true
    },
    rateLimitOptions: {
        windowMs: 15 * 60 * 1000,
        max: 1000,  
        message: 'Too many requests, please try again later.'
    }
};
