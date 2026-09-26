// Notification function
function showNotification(message, type = 'info') {
    // Remove existing notification if any
    const existingNotification = document.querySelector('.notification');
    if (existingNotification) {
        existingNotification.remove();
    }
    
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <span class="notification-message">${message}</span>
            <button class="notification-close" onclick="this.parentElement.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;
    
    // Add to page
    document.body.appendChild(notification);
    
    // Auto remove after 3 seconds
    setTimeout(() => {
        if (notification && notification.parentElement) {
            notification.remove();
        }
    }, 3000);
}

// Utility Functions for Shuffling
function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

function shuffleArrayWithCorrectIndex(options, correctIndex) {
    const correctAnswer = options[correctIndex];
    const shuffledOptions = shuffleArray(options);
    const newCorrectIndex = shuffledOptions.indexOf(correctAnswer);
    
    return {
        options: shuffledOptions,
        correctIndex: newCorrectIndex
    };
}

// Global variables
let currentUser = null;
let authToken = null;
let testData = {
    vision: [],
    hearing: []
};

// API configuration
const API_BASE_URL = window.location.origin + '/api';

// Authentication token management
function getAuthToken() {
    return localStorage.getItem('concentratrack_token') || authToken;
}

function setAuthToken(token) {
    authToken = token;
    if (token) {
        localStorage.setItem('concentratrack_token', token);
    } else {
        localStorage.removeItem('concentratrack_token');
    }
}

function getAuthHeaders() {
    const token = getAuthToken();
    return {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` })
    };
}

// Vision test patterns and questions - Enhanced with more diverse patterns
const visionPatterns = {
    easy: [
        // Simple alphabetical sequences
        { pattern: "A B C ?", options: ["D", "E", "F", "G"], correct: 0 },
        { pattern: "P Q R ?", options: ["S", "T", "U", "V"], correct: 0 },
        { pattern: "M N O ?", options: ["P", "Q", "R", "S"], correct: 0 },
        { pattern: "E F G ?", options: ["H", "I", "J", "K"], correct: 0 },
        
        // Basic number sequences
        { pattern: "2 4 6 ?", options: ["7", "8", "9", "10"], correct: 1 },
        { pattern: "1 3 5 ?", options: ["6", "7", "8", "9"], correct: 1 },
        { pattern: "10 8 6 ?", options: ["4", "5", "2", "3"], correct: 0 },
        { pattern: "5 10 15 ?", options: ["20", "25", "30", "35"], correct: 0 },
        { pattern: "3 6 9 ?", options: ["12", "15", "18", "21"], correct: 0 },
        { pattern: "1 2 3 ?", options: ["4", "5", "6", "7"], correct: 0 },
        
        // Simple shape patterns
        { pattern: "○ ● ○ ?", options: ["●", "○", "◐", "◑"], correct: 0 },
        { pattern: "△ ▲ △ ?", options: ["▲", "△", "▼", "▽"], correct: 0 },
        { pattern: "□ ■ □ ?", options: ["■", "□", "◇", "◆"], correct: 0 },
        { pattern: "● ○ ● ?", options: ["○", "●", "◐", "◑"], correct: 0 },
        { pattern: "▲ ▼ ▲ ?", options: ["▼", "▲", "◄", "►"], correct: 0 },
        
        // Reverse alphabetical
        { pattern: "Z Y X ?", options: ["W", "V", "U", "T"], correct: 0 },
        
        // Days and colors
        { pattern: "Mon Tue Wed ?", options: ["Thu", "Fri", "Sat", "Sun"], correct: 0 },
        { pattern: "Red Blue Red ?", options: ["Blue", "Red", "Green", "Yellow"], correct: 0 },
        
        // Simple patterns
        { pattern: "Big small BIG ?", options: ["SMALL", "small", "Big", "big"], correct: 0 },
        { pattern: "♠ ♥ ♠ ?", options: ["♥", "♠", "♦", "♣"], correct: 0 }
    ],
    medium: [
        // Multiplication sequences
        { pattern: "2 6 18 ?", options: ["54", "36", "72", "24"], correct: 0 },
        { pattern: "1 2 4 8 ?", options: ["16", "12", "10", "14"], correct: 0 },
        { pattern: "3 9 27 ?", options: ["81", "54", "72", "63"], correct: 0 },
        
        // Letter-number combinations
        { pattern: "A1 B2 C3 ?", options: ["D4", "E5", "F6", "G7"], correct: 0 },
        { pattern: "Z26 Y25 X24 ?", options: ["W23", "V22", "U21", "T20"], correct: 0 },
        
        // Square numbers
        { pattern: "1 4 9 16 ?", options: ["20", "25", "30", "36"], correct: 1 },
        
        // Letter pairs
        { pattern: "AB BC CD ?", options: ["DE", "EF", "FG", "GH"], correct: 0 },
        { pattern: "AZ BY CX ?", options: ["DW", "EV", "FU", "GT"], correct: 0 },
        
        // Complex shape patterns
        { pattern: "○●○● ?", options: ["○", "●", "◐", "◑"], correct: 0 },
        { pattern: "△□○ □○△ ?", options: ["○△□", "□△○", "△○□", "○□△"], correct: 0 }
    ],
    hard: [
        // Fibonacci sequence
        { pattern: "1 1 2 3 5 ?", options: ["8", "7", "9", "6"], correct: 0 },
        { pattern: "2 3 5 8 13 ?", options: ["21", "18", "20", "19"], correct: 0 },
        
        // Prime numbers
        { pattern: "2 3 5 7 11 ?", options: ["13", "12", "14", "15"], correct: 0 },
        
        // Complex letter-number patterns
        { pattern: "A4 D9 G16 ?", options: ["J25", "K25", "L25", "M25"], correct: 0 },
        { pattern: "B2D F6H J10L ?", options: ["N14P", "M12O", "O16Q", "P18R"], correct: 0 },
        
        // Look-and-say sequence
        { pattern: "1 11 21 1211 ?", options: ["111221", "121211", "111211", "112211"], correct: 0 },
        
        // Skip letter patterns
        { pattern: "ACE GIK MOQ ?", options: ["SUW", "TVX", "UWY", "VXZ"], correct: 0 },
        
        // Complex mathematical sequences
        { pattern: "1 4 13 40 121 ?", options: ["364", "362", "366", "368"], correct: 0 },
        { pattern: "3 8 18 38 78 ?", options: ["158", "156", "160", "162"], correct: 0 },
        
        // Advanced shape rotations
        { pattern: "○●◐◑ ●◐◑○ ?", options: ["◐◑○●", "◑○●◐", "○●◐◑", "●◐◑○"], correct: 0 }
    ]
};

// Hearing test content - Enhanced with more diverse audio clips
const hearingContent = {
    easy: [
        { text: "Hello", duration: 5 },
        { text: "Good morning", duration: 5 },
        { text: "Thank you", duration: 5 },
        { text: "Welcome home", duration: 5 },
        { text: "Have a nice day", duration: 5 },
        { text: "See you later", duration: 5 },
        { text: "How are you", duration: 5 },
        { text: "Nice weather today", duration: 5 },
        { text: "Please help me", duration: 5 },
        { text: "Good night", duration: 5 }
    ],
    medium: [
        { text: "The weather is beautiful today and perfect for a walk", duration: 10 },
        { text: "I would like to order a large coffee with milk please", duration: 10 },
        { text: "Can you help me find the nearest library in this area", duration: 10 },
        { text: "The meeting starts at three o'clock in the conference room", duration: 10 },
        { text: "Please turn off all the lights when you leave the building", duration: 10 },
        { text: "The train arrives at platform number two in five minutes", duration: 10 },
        { text: "I need to finish my homework before dinner tonight", duration: 10 },
        { text: "The restaurant serves excellent Italian food and fresh pasta", duration: 10 },
        { text: "Could you please speak a little slower so I can understand", duration: 10 },
        { text: "The library closes at nine in the evening on weekdays", duration: 10 }
    ],
    hard: [
        { text: "The comprehensive examination will evaluate students' understanding of complex theoretical concepts and their practical applications in real-world scenarios, requiring critical thinking and analytical skills", duration: 20 },
        { text: "Environmental sustainability requires collaborative efforts from governments, businesses, and individuals to implement innovative solutions for climate change mitigation and renewable energy adoption", duration: 20 },
        { text: "Advanced artificial intelligence algorithms are revolutionizing healthcare by enabling precise diagnostic capabilities and personalized treatment recommendations for patients with various medical conditions", duration: 20 },
        { text: "The interdisciplinary research project combines elements of psychology, neuroscience, and computer science to investigate cognitive processes and decision-making mechanisms in human behavior", duration: 20 },
        { text: "Global economic fluctuations significantly impact international trade relationships and require sophisticated financial strategies to maintain market stability and sustainable growth patterns", duration: 20 },
        { text: "Quantum computing represents a paradigm shift in computational capabilities, offering unprecedented processing power for solving complex mathematical problems and cryptographic challenges", duration: 20 },
        { text: "The archaeological expedition uncovered ancient artifacts that provide valuable insights into prehistoric civilizations and their cultural practices, social structures, and technological achievements", duration: 20 },
        { text: "Biotechnology innovations are transforming agricultural practices through genetic engineering techniques that enhance crop yields, nutritional content, and resistance to environmental stressors", duration: 20 },
        { text: "Space exploration missions require extensive international cooperation and cutting-edge technology to advance our understanding of the universe and search for extraterrestrial life", duration: 20 },
        { text: "Educational reform initiatives focus on developing critical thinking skills and fostering creativity to prepare students for future challenges in an increasingly digital and interconnected world", duration: 20 }
    ]
};

// Current test state
let currentTest = {
    type: null,
    level: null,
    questions: [],
    currentQuestion: 0,
    score: 0,
    answers: [],
    timer: null,
    timeLeft: 0
};

// Initialize app
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

function initializeApp() {
    // Check if user is logged in
    const savedUser = localStorage.getItem('concentraTrackUser');
    const savedToken = localStorage.getItem('concentratrack_token');
    
    if (savedUser && savedToken) {
        currentUser = JSON.parse(savedUser);
        authToken = savedToken;
        showMainApp();
        loadUserData();
    } else {
        showLoginPage();
    }

    // Set up event listeners
    setupEventListeners();
}

function setupEventListeners() {
    // Auth form listeners
    document.getElementById('loginForm').addEventListener('submit', handleLogin);
    document.getElementById('signupForm').addEventListener('submit', handleSignup);
    document.getElementById('showSignup').addEventListener('click', showSignupPage);
    document.getElementById('showLogin').addEventListener('click', showLoginPage);
    document.getElementById('logoutBtn').addEventListener('click', handleLogout);

    // Navigation listeners
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', handleNavigation);
    });

    // Test start listeners
    document.querySelectorAll('.start-test-btn').forEach(btn => {
        btn.addEventListener('click', startTest);
    });

    // Test control listeners
    document.getElementById('visionNextBtn').addEventListener('click', nextVisionQuestion);
    document.getElementById('hearingNextBtn').addEventListener('click', nextHearingQuestion);
    document.getElementById('playAudioBtn').addEventListener('click', playAudio);
    document.getElementById('retakeVisionTest').addEventListener('click', () => showPage('vision-test'));
    document.getElementById('retakeHearingTest').addEventListener('click', () => showPage('hearing-test'));
}

// Authentication functions
async function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;

    if (!email || !password) {
        showNotification('Please enter both email and password', 'error');
        return;
    }

    try {
        showNotification('Logging in...', 'info');
        
        const response = await fetch(`${API_BASE_URL}/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (response.ok) {
            currentUser = data.user;
            setAuthToken(data.token);
            localStorage.setItem('concentraTrackUser', JSON.stringify(data.user));
            
            showNotification(`Welcome back, ${data.user.name}!`, 'success');
            showMainApp();
            await loadUserData();
        } else {
            showNotification(data.error || 'Login failed', 'error');
        }
    } catch (error) {
        console.error('Login error:', error);
        showNotification('Network error. Please check your connection.', 'error');
    }
}

async function handleSignup(e) {
    e.preventDefault();
    const name = document.getElementById('signupName').value.trim();
    const email = document.getElementById('signupEmail').value.trim();
    const password = document.getElementById('signupPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    // Client-side validation
    if (!name || !email || !password || !confirmPassword) {
        showNotification('Please fill in all fields', 'error');
        return;
    }

    if (password !== confirmPassword) {
        showNotification('Passwords do not match', 'error');
        return;
    }

    if (password.length < 6) {
        showNotification('Password must be at least 6 characters long', 'error');
        return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        showNotification('Please enter a valid email address', 'error');
        return;
    }

    try {
        showNotification('Creating your account...', 'info');
        
        const response = await fetch(`${API_BASE_URL}/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ name, email, password })
        });

        const data = await response.json();

        if (response.ok) {
            currentUser = data.user;
            setAuthToken(data.token);
            localStorage.setItem('concentraTrackUser', JSON.stringify(data.user));
            
            showNotification(`Welcome to ConcentraTrack, ${data.user.name}!`, 'success');
            showMainApp();
            await loadUserData();
        } else {
            showNotification(data.error || 'Registration failed', 'error');
        }
    } catch (error) {
        console.error('Registration error:', error);
        showNotification('Network error. Please check your connection.', 'error');
    }
}

function handleLogout() {
    // Clear all user data
    currentUser = null;
    setAuthToken(null);
    localStorage.removeItem('concentraTrackUser');
    
    // Clear test data
    testData = { vision: [], hearing: [] };
    
    showNotification('Logged out successfully', 'success');
    showLoginPage();
}

// Page navigation functions
function showLoginPage() {
    document.getElementById('loginPage').classList.remove('hidden');
    document.getElementById('signupPage').classList.add('hidden');
    document.getElementById('mainApp').classList.add('hidden');
}

function showSignupPage() {
    document.getElementById('loginPage').classList.add('hidden');
    document.getElementById('signupPage').classList.remove('hidden');
    document.getElementById('mainApp').classList.add('hidden');
}

function showMainApp() {
    document.getElementById('loginPage').classList.add('hidden');
    document.getElementById('signupPage').classList.add('hidden');
    document.getElementById('mainApp').classList.remove('hidden');
    showPage('dashboard');
}

function handleNavigation(e) {
    e.preventDefault();
    const page = e.currentTarget.dataset.page;
    
    // Update active nav item
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    e.currentTarget.classList.add('active');
    
    showPage(page);
}

function showPage(pageId) {
    // Hide all pages
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    
    // Show selected page
    document.getElementById(pageId).classList.add('active');
    
    // Load page-specific data
    if (pageId === 'dashboard') {
        updateDashboard();
    } else if (pageId === 'analysis') {
        updateAnalysis();
    } else if (pageId === 'profile') {
        updateProfile();
    }
}

// Data management functions
async function loadUserData() {
    if (!currentUser) return;

    try {
        const response = await fetch(`${API_BASE_URL}/user/${currentUser.id}/tests`, {
            headers: getAuthHeaders()
        });
        
        if (response.ok) {
            const tests = await response.json();
            testData.vision = tests.filter(t => t.type === 'vision');
            testData.hearing = tests.filter(t => t.type === 'hearing');
        } else if (response.status === 401 || response.status === 403) {
            // Token expired or invalid
            handleLogout();
            showNotification('Session expired. Please login again.', 'warning');
        } else {
            console.error('Failed to load user data:', response.status);
        }
    } catch (error) {
        console.error('Error loading user data:', error);
        showNotification('Failed to load your test history', 'warning');
    }
}

async function saveTestResult(result) {
    if (!currentUser) return;

    try {
        const response = await fetch(`${API_BASE_URL}/test-result`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({
                type: result.type,
                level: result.level,
                score: result.score,
                total: result.total,
                percentage: result.percentage,
                answers: result.answers,
                time_taken: result.time_taken
            })
        });

        if (response.ok) {
            const data = await response.json();
            showNotification('Test result saved successfully!', 'success');
            console.log('Test result saved:', data.message);
        } else if (response.status === 401 || response.status === 403) {
            // Token expired or invalid
            handleLogout();
            showNotification('Session expired. Please login again.', 'warning');
            return;
        } else {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to save to server');
        }
    } catch (error) {
        console.error('Error saving test result:', error);
        showNotification('Failed to save test result. Please try again.', 'error');
    }
    
    // Reload user data to get updated statistics
    await loadUserData();
}

// Dashboard functions
function updateDashboard() {
    const visionTests = testData.vision.length;
    const hearingTests = testData.hearing.length;
    const allTests = [...testData.vision, ...testData.hearing];
    
    document.getElementById('visionTestsCount').textContent = visionTests;
    document.getElementById('hearingTestsCount').textContent = hearingTests;
    
    if (allTests.length > 0) {
        const avgScore = allTests.reduce((sum, test) => sum + test.percentage, 0) / allTests.length;
        const bestScore = Math.max(...allTests.map(test => test.percentage));
        
        document.getElementById('avgScore').textContent = Math.round(avgScore) + '%';
        document.getElementById('bestScore').textContent = Math.round(bestScore) + '%';
        
        // Update concentration indicator
        updateConcentrationIndicator(avgScore);
        
        // Update recent tests
        updateRecentTests(allTests);
    } else {
        updateConcentrationIndicator(0);
    }
}

function updateConcentrationIndicator(avgScore) {
    const concentrationBar = document.getElementById('concentrationBar');
    const concentrationMessage = document.getElementById('concentrationMessage');
    
    // Animate the bar
    setTimeout(() => {
        concentrationBar.style.width = avgScore + '%';
    }, 500);
    
    // Update message based on score
    let message, color;
    if (avgScore >= 90) {
        message = "🎉 Excellent concentration! You're in the zone!";
        color = '#4CAF50';
    } else if (avgScore >= 75) {
        message = "👍 Good concentration level. Keep it up!";
        color = '#8BC34A';
    } else if (avgScore >= 60) {
        message = "📊 Average concentration. Room for improvement.";
        color = '#FFC107';
    } else if (avgScore >= 40) {
        message = "⚠️ Concentration needs improvement. Consider taking breaks.";
        color = '#FF9800';
    } else if (avgScore > 0) {
        message = "😴 Poor concentration detected. Rest is recommended.";
        color = '#F44336';
    } else {
        message = "🚀 Take a test to see your concentration level!";
        color = '#667eea';
    }
    
    concentrationMessage.textContent = message;
    concentrationMessage.style.color = color;
}

function updateRecentTests(allTests) {
    const recentTestsList = document.getElementById('recentTestsList');
    
    if (allTests.length === 0) {
        recentTestsList.innerHTML = '<p class="no-tests">No tests completed yet. Start with a vision or hearing test!</p>';
        return;
    }
    
    // Sort by date (most recent first) and take last 5
    const recentTests = allTests
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 5);
    
    recentTestsList.innerHTML = recentTests.map(test => `
        <div class="test-result-item">
            <div class="test-info">
                <div class="test-type">
                    <i class="fas fa-${test.type === 'vision' ? 'eye' : 'headphones'}"></i>
                    <span>${test.type.charAt(0).toUpperCase() + test.type.slice(1)} Test</span>
                </div>
                <div class="test-details">
                    <span class="test-level">${test.level.charAt(0).toUpperCase() + test.level.slice(1)}</span>
                    <span class="test-date">${new Date(test.date).toLocaleDateString()}</span>
                </div>
            </div>
            <div class="test-score ${getScoreClass(test.percentage)}">
                ${test.percentage}%
            </div>
        </div>
    `).join('');
}

function getScoreClass(percentage) {
    if (percentage >= 90) return 'excellent';
    if (percentage >= 75) return 'good';
    if (percentage >= 60) return 'average';
    if (percentage >= 40) return 'needs-improvement';
    return 'poor';
}

// Test functions
function startTest(e) {
    const testType = e.target.dataset.test;
    const level = e.target.dataset.level;
    
    // Show shuffling notification
    showNotification(`🔀 Shuffling ${level} level ${testType} test questions...`, 'info');
    
    currentTest = {
        type: testType,
        level: level,
        questions: [],
        currentQuestion: 0,
        score: 0,
        answers: [],
        timer: null,
        timeLeft: 0
    };
    
    if (testType === 'vision') {
        startVisionTest(level);
    } else if (testType === 'hearing') {
        startHearingTest(level);
    }
}

function startVisionTest(level) {
    // Get questions for the level and shuffle them
    const originalQuestions = [...visionPatterns[level]];
    currentTest.questions = shuffleArray(originalQuestions);
    
    // Also shuffle the options for each question to make it more challenging
    currentTest.questions = currentTest.questions.map(question => {
        const shuffledOptions = shuffleArrayWithCorrectIndex(question.options, question.correct);
        return {
            ...question,
            options: shuffledOptions.options,
            correct: shuffledOptions.correctIndex
        };
    });
    
    // Show test area
    document.getElementById('visionTestMenu').classList.add('hidden');
    document.getElementById('visionTestArea').classList.remove('hidden');
    
    // Update UI
    document.getElementById('visionLevel').textContent = level.charAt(0).toUpperCase() + level.slice(1);
    document.getElementById('visionTotalQ').textContent = currentTest.questions.length;
    
    showVisionQuestion();
}

function showVisionQuestion() {
    const question = currentTest.questions[currentTest.currentQuestion];
    const timeLimit = currentTest.level === 'easy' ? 20 : currentTest.level === 'medium' ? 10 : 5;
    
    // Update question info
    document.getElementById('visionCurrentQ').textContent = currentTest.currentQuestion + 1;
    
    // Update progress bar
    const progressPercent = ((currentTest.currentQuestion + 1) / currentTest.questions.length) * 100;
    document.getElementById('visionProgressBar').style.width = progressPercent + '%';
    document.getElementById('visionProgressPercent').textContent = Math.round(progressPercent) + '%';
    
    // Update level badge color based on difficulty
    const levelBadge = document.querySelector('.test-level-badge');
    levelBadge.className = 'test-level-badge';
    if (currentTest.level === 'easy') {
        levelBadge.style.background = 'linear-gradient(135deg, #4CAF50 0%, #8BC34A 100%)';
    } else if (currentTest.level === 'medium') {
        levelBadge.style.background = 'linear-gradient(135deg, #FF9800 0%, #FFC107 100%)';
    } else {
        levelBadge.style.background = 'linear-gradient(135deg, #F44336 0%, #E91E63 100%)';
    }
    
    // Show pattern
    document.getElementById('patternDisplay').textContent = question.pattern;
    
    // Show options
    const optionsContainer = document.getElementById('patternOptions');
    optionsContainer.innerHTML = '';
    
    question.options.forEach((option, index) => {
        const optionDiv = document.createElement('div');
        optionDiv.className = 'pattern-option';
        optionDiv.textContent = option;
        optionDiv.addEventListener('click', () => selectVisionOption(index));
        optionsContainer.appendChild(optionDiv);
    });
    
    // Start timer
    currentTest.timeLeft = timeLimit;
    updateVisionTimer();
    currentTest.timer = setInterval(() => {
        currentTest.timeLeft--;
        updateVisionTimer();
        
        if (currentTest.timeLeft <= 0) {
            clearInterval(currentTest.timer);
            selectVisionOption(-1); // No answer selected
        }
    }, 1000);
}

function updateVisionTimer() {
    const timerElement = document.getElementById('visionTimer');
    timerElement.textContent = currentTest.timeLeft;
    
    // Change timer color based on time remaining
    const timerContainer = timerElement.parentElement;
    if (currentTest.timeLeft <= 3) {
        timerContainer.style.background = '#f44336';
        timerContainer.style.animation = 'pulse 1s infinite';
    } else if (currentTest.timeLeft <= 5) {
        timerContainer.style.background = '#ff9800';
        timerContainer.style.animation = 'none';
    } else {
        timerContainer.style.background = '#ff6b6b';
        timerContainer.style.animation = 'none';
    }
}

function selectVisionOption(selectedIndex) {
    clearInterval(currentTest.timer);
    
    const question = currentTest.questions[currentTest.currentQuestion];
    const isCorrect = selectedIndex === question.correct;
    
    if (isCorrect) {
        currentTest.score++;
    }
    
    currentTest.answers.push({
        question: currentTest.currentQuestion,
        selected: selectedIndex,
        correct: question.correct,
        isCorrect: isCorrect
    });
    
    // Show feedback
    const options = document.querySelectorAll('.pattern-option');
    options.forEach((option, index) => {
        if (index === question.correct) {
            option.classList.add('correct');
        } else if (index === selectedIndex && !isCorrect) {
            option.classList.add('incorrect');
        }
        option.style.pointerEvents = 'none';
    });
    
    // Show next button
    document.getElementById('visionNextBtn').classList.remove('hidden');
}

function nextVisionQuestion() {
    currentTest.currentQuestion++;
    
    if (currentTest.currentQuestion >= currentTest.questions.length) {
        finishVisionTest();
    } else {
        document.getElementById('visionNextBtn').classList.add('hidden');
        showVisionQuestion();
    }
}

function finishVisionTest() {
    const percentage = Math.round((currentTest.score / currentTest.questions.length) * 100);
    
    // Save result
    const result = {
        type: 'vision',
        level: currentTest.level,
        score: currentTest.score,
        total: currentTest.questions.length,
        percentage: percentage,
        answers: currentTest.answers
    };
    
    saveTestResult(result);
    
    // Show results
    document.getElementById('visionTestArea').classList.add('hidden');
    document.getElementById('visionResults').classList.remove('hidden');
    
    document.getElementById('visionScore').textContent = `${currentTest.score}/${currentTest.questions.length}`;
    document.getElementById('visionPercentage').textContent = percentage + '%';
    document.getElementById('visionResultLevel').textContent = currentTest.level.charAt(0).toUpperCase() + currentTest.level.slice(1);
}

function startHearingTest(level) {
    // Get questions for the level and shuffle them
    const originalQuestions = [...hearingContent[level]];
    currentTest.questions = shuffleArray(originalQuestions);
    
    // Show test area
    document.getElementById('hearingTestMenu').classList.add('hidden');
    document.getElementById('hearingTestArea').classList.remove('hidden');
    
    // Update UI
    document.getElementById('hearingLevel').textContent = level.charAt(0).toUpperCase() + level.slice(1);
    document.getElementById('hearingTotalQ').textContent = currentTest.questions.length;
    
    // Add input event listener for stats
    const audioInput = document.getElementById('audioInput');
    audioInput.addEventListener('input', updateInputStats);
    
    showHearingQuestion();
}

function showHearingQuestion() {
    // Update question info
    document.getElementById('hearingCurrentQ').textContent = currentTest.currentQuestion + 1;
    
    // Update progress bar
    const progressPercent = ((currentTest.currentQuestion + 1) / currentTest.questions.length) * 100;
    document.getElementById('hearingProgressBar').style.width = progressPercent + '%';
    document.getElementById('hearingProgressPercent').textContent = Math.round(progressPercent) + '%';
    
    // Update level badge color based on difficulty
    const levelBadge = document.querySelector('#hearingTestArea .test-level-badge');
    if (levelBadge) {
        levelBadge.className = 'test-level-badge';
        if (currentTest.level === 'easy') {
            levelBadge.style.background = 'linear-gradient(135deg, #4CAF50 0%, #8BC34A 100%)';
        } else if (currentTest.level === 'medium') {
            levelBadge.style.background = 'linear-gradient(135deg, #FF9800 0%, #FFC107 100%)';
        } else {
            levelBadge.style.background = 'linear-gradient(135deg, #F44336 0%, #E91E63 100%)';
        }
    }
    
    // Update audio duration display
    const question = currentTest.questions[currentTest.currentQuestion];
    document.getElementById('audioDuration').textContent = question.duration + 's';
    
    // Clear previous input
    const audioInput = document.getElementById('audioInput');
    audioInput.value = '';
    updateInputStats();
    
    // Reset audio button and status
    const playBtn = document.getElementById('playAudioBtn');
    const audioStatus = document.getElementById('audioStatus');
    
    playBtn.disabled = false;
    playBtn.innerHTML = '<i class="fas fa-play"></i> Play Audio';
    
    audioStatus.className = 'status-indicator ready';
    audioStatus.innerHTML = '<i class="fas fa-play-circle"></i> Ready to Play';
    
    // Reset progress bar
    document.getElementById('audioProgressBar').style.width = '0%';
}

function updateInputStats() {
    const input = document.getElementById('audioInput');
    const text = input.value.trim();
    const wordCount = text ? text.split(/\s+/).length : 0;
    const charCount = text.length;
    
    document.getElementById('wordCount').textContent = wordCount + ' words';
    document.getElementById('charCount').textContent = charCount + ' characters';
}

function playAudio() {
    const question = currentTest.questions[currentTest.currentQuestion];
    const playBtn = document.getElementById('playAudioBtn');
    const progressBar = document.getElementById('audioProgressBar');
    const audioStatus = document.getElementById('audioStatus');
    
    // Update button and status during playback
    playBtn.disabled = true;
    playBtn.innerHTML = '<i class="fas fa-pause"></i> Playing...';
    
    audioStatus.className = 'status-indicator playing';
    audioStatus.innerHTML = '<i class="fas fa-volume-up"></i> Playing Audio';
    
    // Simulate audio playback with text-to-speech
    if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(question.text);
        
        // Adjust speech rate based on difficulty level
        if (currentTest.level === 'easy') {
            utterance.rate = 0.7;
        } else if (currentTest.level === 'medium') {
            utterance.rate = 0.9;
        } else {
            utterance.rate = 1.1;
        }
        
        utterance.pitch = 1;
        utterance.volume = 0.8;
        
        // Animate progress bar
        let progress = 0;
        const duration = question.duration * 1000; // Convert to milliseconds
        const interval = 50; // Update every 50ms
        const increment = (interval / duration) * 100;
        
        const progressTimer = setInterval(() => {
            progress += increment;
            progressBar.style.width = Math.min(progress, 100) + '%';
            
            if (progress >= 100) {
                clearInterval(progressTimer);
                
                // Reset button and status after playback
                playBtn.disabled = false;
                playBtn.innerHTML = '<i class="fas fa-redo"></i> Replay Audio';
                
                audioStatus.className = 'status-indicator finished';
                audioStatus.innerHTML = '<i class="fas fa-check-circle"></i> Audio Complete';
            }
        }, interval);
        
        utterance.onend = () => {
            clearInterval(progressTimer);
            progressBar.style.width = '100%';
            
            playBtn.disabled = false;
            playBtn.innerHTML = '<i class="fas fa-redo"></i> Replay Audio';
            
            audioStatus.className = 'status-indicator finished';
            audioStatus.innerHTML = '<i class="fas fa-check-circle"></i> Audio Complete';
        };
        
        speechSynthesis.speak(utterance);
    } else {
        // Fallback for browsers without speech synthesis
        alert(`Audio would play: "${question.text}"`);
        playBtn.disabled = false;
        playBtn.innerHTML = '<i class="fas fa-redo"></i> Replay Audio';
        
        audioStatus.className = 'status-indicator finished';
        audioStatus.innerHTML = '<i class="fas fa-check-circle"></i> Audio Complete';
    }
}

function nextHearingQuestion() {
    const userInput = document.getElementById('audioInput').value.trim();
    const correctText = currentTest.questions[currentTest.currentQuestion].text;
    
    // Calculate similarity percentage
    const similarity = calculateTextSimilarity(userInput.toLowerCase(), correctText.toLowerCase());
    
    currentTest.answers.push({
        question: currentTest.currentQuestion,
        userInput: userInput,
        correctText: correctText,
        similarity: similarity
    });
    
    currentTest.currentQuestion++;
    
    if (currentTest.currentQuestion >= currentTest.questions.length) {
        finishHearingTest();
    } else {
        showHearingQuestion();
    }
}

function calculateTextSimilarity(text1, text2) {
    // Simple word-based similarity calculation
    const words1 = text1.split(/\s+/).filter(word => word.length > 0);
    const words2 = text2.split(/\s+/).filter(word => word.length > 0);
    
    if (words2.length === 0) return 0;
    
    let matches = 0;
    words1.forEach(word1 => {
        if (words2.some(word2 => word2.includes(word1) || word1.includes(word2))) {
            matches++;
        }
    });
    
    return Math.round((matches / words2.length) * 100);
}

function finishHearingTest() {
    const averageAccuracy = currentTest.answers.reduce((sum, answer) => sum + answer.similarity, 0) / currentTest.answers.length;
    
    // Save result
    const result = {
        type: 'hearing',
        level: currentTest.level,
        percentage: Math.round(averageAccuracy),
        completed: currentTest.answers.length,
        total: currentTest.questions.length,
        answers: currentTest.answers
    };
    
    saveTestResult(result);
    
    // Show results
    document.getElementById('hearingTestArea').classList.add('hidden');
    document.getElementById('hearingResults').classList.remove('hidden');
    
    document.getElementById('hearingAccuracy').textContent = Math.round(averageAccuracy) + '%';
    document.getElementById('hearingCompleted').textContent = `${currentTest.answers.length}/${currentTest.questions.length}`;
    document.getElementById('hearingResultLevel').textContent = currentTest.level.charAt(0).toUpperCase() + currentTest.level.slice(1);
}

// Analysis functions
function updateAnalysis() {
    // Calculate averages by level for each test type
    const visionByLevel = { easy: [], medium: [], hard: [] };
    const hearingByLevel = { easy: [], medium: [], hard: [] };
    
    testData.vision.forEach(test => {
        visionByLevel[test.level].push(test.percentage);
    });
    
    testData.hearing.forEach(test => {
        hearingByLevel[test.level].push(test.percentage);
    });
    
    // Update vision averages
    document.getElementById('visionEasyAvg').textContent = 
        visionByLevel.easy.length > 0 ? 
        Math.round(visionByLevel.easy.reduce((a, b) => a + b, 0) / visionByLevel.easy.length) + '%' : '0%';
    
    document.getElementById('visionMediumAvg').textContent = 
        visionByLevel.medium.length > 0 ? 
        Math.round(visionByLevel.medium.reduce((a, b) => a + b, 0) / visionByLevel.medium.length) + '%' : '0%';
    
    document.getElementById('visionHardAvg').textContent = 
        visionByLevel.hard.length > 0 ? 
        Math.round(visionByLevel.hard.reduce((a, b) => a + b, 0) / visionByLevel.hard.length) + '%' : '0%';
    
    // Update hearing averages
    document.getElementById('hearingEasyAvg').textContent = 
        hearingByLevel.easy.length > 0 ? 
        Math.round(hearingByLevel.easy.reduce((a, b) => a + b, 0) / hearingByLevel.easy.length) + '%' : '0%';
    
    document.getElementById('hearingMediumAvg').textContent = 
        hearingByLevel.medium.length > 0 ? 
        Math.round(hearingByLevel.medium.reduce((a, b) => a + b, 0) / hearingByLevel.medium.length) + '%' : '0%';
    
    document.getElementById('hearingHardAvg').textContent = 
        hearingByLevel.hard.length > 0 ? 
        Math.round(hearingByLevel.hard.reduce((a, b) => a + b, 0) / hearingByLevel.hard.length) + '%' : '0%';
}

// Profile functions
function updateProfile() {
    if (currentUser) {
        document.getElementById('profileName').textContent = currentUser.name;
        document.getElementById('profileEmail').textContent = currentUser.email;
        
        const totalTests = (currentUser.tests || []).length;
        document.getElementById('totalTests').textContent = totalTests;
        
        const joinDate = new Date(currentUser.joinDate).toLocaleDateString();
        document.getElementById('memberSince').textContent = joinDate;
        
        // Calculate best streak (simplified)
        document.getElementById('bestStreak').textContent = Math.max(1, Math.floor(totalTests / 3)) + ' days';
    }
}

// Reset test UI functions
function resetVisionTest() {
    document.getElementById('visionTestMenu').classList.remove('hidden');
    document.getElementById('visionTestArea').classList.add('hidden');
    document.getElementById('visionResults').classList.add('hidden');
    document.getElementById('visionNextBtn').classList.add('hidden');
}

function resetHearingTest() {
    document.getElementById('hearingTestMenu').classList.remove('hidden');
    document.getElementById('hearingTestArea').classList.add('hidden');
    document.getElementById('hearingResults').classList.add('hidden');
    
    // Remove input event listener
    const audioInput = document.getElementById('audioInput');
    audioInput.removeEventListener('input', updateInputStats);
}

// Add event listeners for test resets
document.addEventListener('DOMContentLoaded', function() {
    // Add listeners for returning to test menus
    document.addEventListener('click', function(e) {
        if (e.target.id === 'retakeVisionTest') {
            resetVisionTest();
        } else if (e.target.id === 'retakeHearingTest') {
            resetHearingTest();
        }
    });
});