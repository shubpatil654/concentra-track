const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs').promises;
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'concentratrack-secret-key-2024';

const fsSync = require('fs');

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Serve static files
app.use(express.static(path.join(__dirname)));
app.use(express.static(path.join(__dirname, 'public')));

// Explicit static asset routes for serverless environments
app.get('/styles.css', (req, res) => {
    res.setHeader('Content-Type', 'text/css');
    const candidates = [
        path.join(__dirname, 'styles.css'),
        path.join(__dirname, 'public', 'styles.css'),
        path.join(__dirname, 'api', 'styles.css')
    ];
    for (const c of candidates) {
        try {
            if (fsSync.existsSync(c)) {
                return res.send(fsSync.readFileSync(c, 'utf8'));
            }
        } catch (e) {}
    }
    res.status(404).send('/* styles not found */');
});

app.get('/script.js', (req, res) => {
    res.setHeader('Content-Type', 'application/javascript');
    const candidates = [
        path.join(__dirname, 'script.js'),
        path.join(__dirname, 'public', 'script.js'),
        path.join(__dirname, 'api', 'script.js')
    ];
    for (const c of candidates) {
        try {
            if (fsSync.existsSync(c)) {
                return res.send(fsSync.readFileSync(c, 'utf8'));
            }
        } catch (e) {}
    }
    res.status(404).send('// script not found');
});

// Data storage paths
const SEED_DATA_DIR = path.join(__dirname, 'data');
const DATA_DIR = process.env.VERCEL ? '/tmp/data' : SEED_DATA_DIR;
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const TESTS_FILE = path.join(DATA_DIR, 'tests.json');

// Ensure data directory exists
async function ensureDataDirectory() {
    try {
        await fs.access(DATA_DIR);
    } catch {
        await fs.mkdir(DATA_DIR, { recursive: true });
    }
}

// Load data from files
async function loadUsers() {
    try {
        const data = await fs.readFile(USERS_FILE, 'utf8');
        return JSON.parse(data);
    } catch {
        try {
            const seedData = await fs.readFile(path.join(SEED_DATA_DIR, 'users.json'), 'utf8');
            return JSON.parse(seedData);
        } catch {
            return [];
        }
    }
}

async function loadTests() {
    try {
        const data = await fs.readFile(TESTS_FILE, 'utf8');
        return JSON.parse(data);
    } catch {
        try {
            const seedData = await fs.readFile(path.join(SEED_DATA_DIR, 'tests.json'), 'utf8');
            return JSON.parse(seedData);
        } catch {
            return [];
        }
    }
}

// Save data to files
async function saveUsers(users) {
    await fs.writeFile(USERS_FILE, JSON.stringify(users, null, 2));
}

async function saveTests(tests) {
    await fs.writeFile(TESTS_FILE, JSON.stringify(tests, null, 2));
}

// JWT middleware
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid or expired token' });
        }
        req.user = user;
        next();
    });
}

// Initialize data directory
ensureDataDirectory();

// Routes

// Serve main page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// User registration
app.post('/api/register', async (req, res) => {
    try {
        const { name, email, password } = req.body;
        
        // Validation
        if (!name || !email || !password) {
            return res.status(400).json({ error: 'Name, email, and password are required' });
        }
        
        if (password.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters long' });
        }
        
        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ error: 'Please enter a valid email address' });
        }
        
        const users = await loadUsers();
        
        // Check if user already exists
        const existingUser = users.find(user => user.email.toLowerCase() === email.toLowerCase());
        if (existingUser) {
            return res.status(400).json({ error: 'User with this email already exists' });
        }
        
        // Hash password
        const saltRounds = 12;
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        
        // Create new user
        const newUser = {
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            name: name.trim(),
            email: email.toLowerCase().trim(),
            password: hashedPassword,
            joinDate: new Date().toISOString(),
            lastLogin: new Date().toISOString(),
            isActive: true
        };
        
        users.push(newUser);
        await saveUsers(users);
        
        // Generate JWT token
        const token = jwt.sign(
            { 
                userId: newUser.id, 
                email: newUser.email,
                name: newUser.name
            }, 
            JWT_SECRET, 
            { expiresIn: '7d' }
        );
        
        res.status(201).json({
            message: 'User created successfully',
            user: {
                id: newUser.id,
                name: newUser.name,
                email: newUser.email,
                joinDate: newUser.joinDate
            },
            token: token
        });
        
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Internal server error during registration' });
    }
});

// User login
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        // Validation
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }
        
        const users = await loadUsers();
        const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
        
        if (!user) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }
        
        if (!user.isActive) {
            return res.status(401).json({ error: 'Account is deactivated. Please contact support.' });
        }
        
        // Verify password
        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }
        
        // Update last login
        user.lastLogin = new Date().toISOString();
        await saveUsers(users);
        
        // Generate JWT token
        const token = jwt.sign(
            { 
                userId: user.id, 
                email: user.email,
                name: user.name
            }, 
            JWT_SECRET, 
            { expiresIn: '7d' }
        );
        
        res.json({
            message: 'Login successful',
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                joinDate: user.joinDate,
                lastLogin: user.lastLogin
            },
            token: token
        });
        
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Internal server error during login' });
    }
});

// Get user profile (protected route)
app.get('/api/user/:id', authenticateToken, async (req, res) => {
    try {
        const userId = req.params.id;
        
        // Check if user is accessing their own profile
        if (req.user.userId !== userId) {
            return res.status(403).json({ error: 'Access denied' });
        }
        
        const users = await loadUsers();
        const user = users.find(u => u.id === userId);
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        res.json({
            id: user.id,
            name: user.name,
            email: user.email,
            joinDate: user.joinDate,
            lastLogin: user.lastLogin
        });
        
    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Save test result (protected route)
app.post('/api/test-result', authenticateToken, async (req, res) => {
    try {
        const { type, level, score, total, percentage, answers, time_taken } = req.body;
        const userId = req.user.userId;
        
        // Validation
        if (!type || !level || score === undefined || !total || percentage === undefined) {
            return res.status(400).json({ error: 'Missing required test result fields' });
        }
        
        const tests = await loadTests();
        
        const testResult = {
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            userId: userId,
            type: type,
            level: level,
            score: parseInt(score),
            total: parseInt(total),
            percentage: parseFloat(percentage),
            time_taken: time_taken ? parseInt(time_taken) : null,
            answers: answers || [],
            date: new Date().toISOString()
        };
        
        tests.push(testResult);
        await saveTests(tests);
        
        res.status(201).json({
            message: 'Test result saved successfully',
            result: testResult
        });
        
    } catch (error) {
        console.error('Save test result error:', error);
        res.status(500).json({ error: 'Internal server error while saving test result' });
    }
});

// Get user test results (protected route)
app.get('/api/user/:id/tests', authenticateToken, async (req, res) => {
    try {
        const userId = req.params.id;
        
        // Check if user is accessing their own tests
        if (req.user.userId !== userId) {
            return res.status(403).json({ error: 'Access denied' });
        }
        
        const tests = await loadTests();
        const userTests = tests.filter(test => test.userId === userId);
        
        // Sort by date (most recent first)
        userTests.sort((a, b) => new Date(b.date) - new Date(a.date));
        
        res.json(userTests);
        
    } catch (error) {
        console.error('Get user tests error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get test statistics (protected route)
app.get('/api/user/:id/stats', authenticateToken, async (req, res) => {
    try {
        const userId = req.params.id;
        
        // Check if user is accessing their own stats
        if (req.user.userId !== userId) {
            return res.status(403).json({ error: 'Access denied' });
        }
        
        const tests = await loadTests();
        const userTests = tests.filter(test => test.userId === userId);
        
        const visionTests = userTests.filter(test => test.type === 'vision');
        const hearingTests = userTests.filter(test => test.type === 'hearing');
        
        const stats = {
            totalTests: userTests.length,
            visionTests: visionTests.length,
            hearingTests: hearingTests.length,
            averageScore: calculateAverageScore(userTests),
            bestScore: userTests.length > 0 ? Math.max(...userTests.map(test => test.percentage)) : 0,
            visionStats: calculateLevelStats(visionTests),
            hearingStats: calculateLevelStats(hearingTests),
            progressTrend: calculateProgressTrend(userTests),
            recentActivity: userTests.slice(0, 5).map(test => ({
                type: test.type,
                level: test.level,
                percentage: test.percentage,
                date: test.date
            }))
        };
        
        res.json(stats);
        
    } catch (error) {
        console.error('Get user stats error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get leaderboard (public route with anonymized data)
app.get('/api/leaderboard', async (req, res) => {
    try {
        const users = await loadUsers();
        const tests = await loadTests();
        
        const userStats = [];
        
        for (const user of users) {
            const userTests = tests.filter(test => test.userId === user.id);
            if (userTests.length > 0) {
                const avgScore = calculateAverageScore(userTests);
                userStats.push({
                    name: user.name.charAt(0) + '*'.repeat(user.name.length - 1), // Anonymize
                    averageScore: Math.round(avgScore * 10) / 10,
                    totalTests: userTests.length,
                    joinDate: user.joinDate
                });
            }
        }
        
        // Sort by average score and take top 10
        const leaderboard = userStats
            .sort((a, b) => b.averageScore - a.averageScore)
            .slice(0, 10);
        
        res.json(leaderboard);
        
    } catch (error) {
        console.error('Get leaderboard error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Logout (protected route)
app.post('/api/logout', authenticateToken, (req, res) => {
    res.json({ message: 'Logged out successfully' });
});

// Change password (protected route)
app.post('/api/change-password', authenticateToken, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const userId = req.user.userId;
        
        if (!currentPassword || !newPassword) {
            return res.status(400).json({ error: 'Current password and new password are required' });
        }
        
        if (newPassword.length < 6) {
            return res.status(400).json({ error: 'New password must be at least 6 characters long' });
        }
        
        const users = await loadUsers();
        const user = users.find(u => u.id === userId);
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        // Verify current password
        const isValidPassword = await bcrypt.compare(currentPassword, user.password);
        if (!isValidPassword) {
            return res.status(401).json({ error: 'Current password is incorrect' });
        }
        
        // Hash new password
        const saltRounds = 12;
        user.password = await bcrypt.hash(newPassword, saltRounds);
        
        await saveUsers(users);
        
        res.json({ message: 'Password changed successfully' });
        
    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Helper Functions
function calculateAverageScore(tests) {
    if (!tests || tests.length === 0) return 0;
    return Math.round((tests.reduce((sum, test) => sum + test.percentage, 0) / tests.length) * 10) / 10;
}

function calculateLevelStats(tests) {
    const stats = { 
        easy: { average: 0, count: 0 }, 
        medium: { average: 0, count: 0 }, 
        hard: { average: 0, count: 0 } 
    };
    
    ['easy', 'medium', 'hard'].forEach(level => {
        const levelTests = tests.filter(test => test.level === level);
        if (levelTests.length > 0) {
            stats[level] = {
                average: Math.round((levelTests.reduce((sum, test) => sum + test.percentage, 0) / levelTests.length) * 10) / 10,
                count: levelTests.length
            };
        }
    });
    
    return stats;
}

function calculateProgressTrend(tests) {
    if (!tests || tests.length < 2) return 'neutral';
    
    // Sort by date and compare recent vs older performance
    const sortedTests = tests.sort((a, b) => new Date(a.date) - new Date(b.date));
    const midPoint = Math.floor(sortedTests.length / 2);
    const recentTests = sortedTests.slice(midPoint);
    const olderTests = sortedTests.slice(0, midPoint);
    
    if (olderTests.length === 0) return 'neutral';
    
    const recentAvg = calculateAverageScore(recentTests);
    const olderAvg = calculateAverageScore(olderTests);
    
    if (recentAvg > olderAvg + 5) return 'improving';
    if (recentAvg < olderAvg - 5) return 'declining';
    return 'stable';
}

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({ error: 'Something went wrong!' });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Route not found' });
});

if (require.main === module || !process.env.VERCEL) {
    app.listen(PORT, () => {
        console.log(`ConcentraTrack server running on port ${PORT}`);
        console.log(`Visit http://localhost:${PORT} to access the application`);
        console.log(`Data will be stored in: ${DATA_DIR}`);
    });
}

module.exports = app;