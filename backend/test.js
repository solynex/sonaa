const express = require('express');
const cors = require('cors');

const app = express();

app.use(cors({
    origin: '*',
    credentials: true
}));

app.use(express.json());

app.get('/api/test', (req, res) => {
    res.json({ message: 'Backend is working!' });
});

app.post('/api/auth/login', (req, res) => {
    res.json({ 
        token: 'test-token',
        user: {
            name: 'Test User',
            email: req.body.email
        }
    });
});

app.listen(5000, () => {
    console.log('Test server running on port 5000');
});
