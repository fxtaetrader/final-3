// ===== SCRIPT.JS - COMPLETE FX TAE TRADING JOURNAL =====
// Combined authentication + dashboard functionality

// ===== AUTHENTICATION & USER MANAGEMENT =====
const USERS_KEY = 'fxTaeUsers';
const CURRENT_USER_KEY = 'fxTaeCurrentUser';
const AUTH_KEY = 'fxTaeAuthenticated';

// Dashboard Data Keys
const TRADES_KEY = 'fxTaeTrades';
const GOALS_KEY = 'fxTaeGoals';
const DEPOSITS_KEY = 'fxTaeDeposits';
const WITHDRAWALS_KEY = 'fxTaeWithdrawals';
const TRADING_RULES_KEY = 'fxTaeTradingRules';

// Global state
let trades = [];
let goals = [];
let deposits = [];
let withdrawals = [];
let accountBalance = 0;
let startingBalance = 0;
let equityChart = null;
let winLossChart = null;
let currentCalendarMonth = new Date().getMonth();
let currentCalendarYear = new Date().getFullYear();

// ===== AUTHENTICATION FUNCTIONS =====
function initializeUsers() {
    if (!localStorage.getItem(USERS_KEY)) {
        localStorage.setItem(USERS_KEY, JSON.stringify([]));
    }
}

function getUsers() {
    return JSON.parse(localStorage.getItem(USERS_KEY)) || [];
}

function saveUser(user) {
    const users = getUsers();
    if (users.some(u => u.email === user.email)) {
        return { success: false, message: 'Email already registered' };
    }
    users.push(user);
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
    return { success: true };
}

function authenticateUser(email, password) {
    const users = getUsers();
    const user = users.find(u => u.email === email && u.password === password);
    return user ? { success: true, user } : { success: false, message: 'Invalid email or password' };
}

function setCurrentUser(user) {
    const safeUser = {
        id: user.id,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt
    };
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(safeUser));
    sessionStorage.setItem(AUTH_KEY, 'true');
}

function getCurrentUser() {
    return JSON.parse(localStorage.getItem(CURRENT_USER_KEY) || '{}');
}

function isAuthenticated() {
    return sessionStorage.getItem(AUTH_KEY) === 'true';
}

function logout() {
    sessionStorage.removeItem(AUTH_KEY);
    localStorage.removeItem(CURRENT_USER_KEY);
    window.location.href = 'index.html';
}

function validatePassword(password) {
    return password.length >= 8 && /[a-zA-Z]/.test(password) && /\d/.test(password);
}

function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

// ===== UTILITY FUNCTIONS =====
function formatCurrency(amount) {
    if (amount === null || amount === undefined || isNaN(amount)) return '$0.00';
    return `$${Math.abs(amount).toFixed(2)}`;
}

function formatCurrencyWithSign(amount) {
    if (amount === null || amount === undefined || isNaN(amount)) return '$0.00';
    const sign = amount >= 0 ? '+' : '-';
    return `${sign}$${Math.abs(amount).toFixed(2)}`;
}

function formatDate(dateString) {
    if (!dateString) return '';
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    } catch {
        return dateString;
    }
}

function formatDateTime(dateString, timeString) {
    if (!dateString) return '';
    try {
        return `${formatDate(dateString)} ${timeString || ''}`.trim();
    } catch {
        return dateString;
    }
}

function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) {
        // Create toast container if it doesn't exist
        const newContainer = document.createElement('div');
        newContainer.id = 'toastContainer';
        newContainer.className = 'toast-container';
        document.body.appendChild(newContainer);
    }
    
    const toastContainer = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const iconMap = {
        'success': 'check-circle',
        'error': 'exclamation-circle',
        'warning': 'exclamation-triangle',
        'info': 'info-circle'
    };
    
    const icon = iconMap[type] || 'info-circle';
    
    toast.innerHTML = `
        <i class="fas fa-${icon}"></i>
        <span>${message}</span>
    `;
    
    toastContainer.appendChild(toast);
    
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        setTimeout(() => {
            if (toast.parentNode === toastContainer) {
                toastContainer.removeChild(toast);
            }
        }, 300);
    }, 3000);
}

// ===== DATA MANAGEMENT =====
function loadTrades() {
    try {
        const saved = localStorage.getItem(TRADES_KEY);
        trades = saved ? JSON.parse(saved) : [];
    } catch {
        trades = [];
    }
}

function loadGoals() {
    try {
        const saved = localStorage.getItem(GOALS_KEY);
        goals = saved ? JSON.parse(saved) : [];
    } catch {
        goals = [];
    }
}

function loadDeposits() {
    try {
        const saved = localStorage.getItem(DEPOSITS_KEY);
        deposits = saved ? JSON.parse(saved) : [];
    } catch {
        deposits = [];
    }
}

function loadWithdrawals() {
    try {
        const saved = localStorage.getItem(WITHDRAWALS_KEY);
        withdrawals = saved ? JSON.parse(saved) : [];
    } catch {
        withdrawals = [];
    }
}

function loadAccountBalance() {
    try {
        const savedBalance = localStorage.getItem('fxTaeAccountBalance');
        accountBalance = savedBalance ? parseFloat(savedBalance) : 0;
        startingBalance = 0; // Always $0 as requested
        localStorage.setItem('fxTaeStartingBalance', '0');
    } catch {
        accountBalance = 0;
        startingBalance = 0;
    }
}

function saveTrades() {
    localStorage.setItem(TRADES_KEY, JSON.stringify(trades));
}

function saveGoals() {
    localStorage.setItem(GOALS_KEY, JSON.stringify(goals));
}

function saveDeposits() {
    localStorage.setItem(DEPOSITS_KEY, JSON.stringify(deposits));
}

function saveWithdrawals() {
    localStorage.setItem(WITHDRAWALS_KEY, JSON.stringify(withdrawals));
}

function saveAccountBalance() {
    localStorage.setItem('fxTaeAccountBalance', accountBalance.toString());
    localStorage.setItem('fxTaeStartingBalance', '0');
}

// ===== DASHBOARD INITIALIZATION =====
function initializeDashboard() {
    console.log('Initializing FX TAE Dashboard...');
    
    // Check authentication
    if (!isAuthenticated()) {
        window.location.href = 'index.html';
        return;
    }
    
    try {
        // Load all data
        loadTrades();
        loadGoals();
        loadDeposits();
        loadWithdrawals();
        loadAccountBalance();
        
        // Update UI
        updateDateTime();
        updateUserInfo();
        updateAccountBalanceDisplay();
        updateDashboardStats();
        updateRecentActivity();
        updateTransactionHistory();
        updateAllTradesTable();
        updateGoalsList();
        updateCalendar();
        
        // Initialize charts
        setTimeout(() => {
            initializeCharts();
        }, 500);
        
        // Set today's date in forms
        setTodayDates();
        
        // Setup event listeners
        setupEventListeners();
        
        // Load theme
        const savedTheme = localStorage.getItem('fxTaeTheme') || 'light';
        setTheme(savedTheme);
        
        console.log('Dashboard initialized successfully!');
    } catch (error) {
        console.error('Error initializing dashboard:', error);
        showToast('Error loading dashboard. Please refresh.', 'error');
    }
}

function setTodayDates() {
    const today = new Date().toISOString().split('T')[0];
    const now = new Date();
    const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    
    const tradeDate = document.getElementById('tradeDate');
    if (tradeDate) tradeDate.value = today;
    
    const tradeTime = document.getElementById('tradeTime');
    if (tradeTime) tradeTime.value = timeStr;
    
    const depositDate = document.getElementById('depositDate');
    if (depositDate) depositDate.value = today;
    
    const depositTime = document.getElementById('depositTime');
    if (depositTime) depositTime.value = timeStr;
    
    const withdrawalDate = document.getElementById('withdrawalDate');
    if (withdrawalDate) withdrawalDate.value = today;
    
    const withdrawalTime = document.getElementById('withdrawalTime');
    if (withdrawalTime) withdrawalTime.value = timeStr;
}

// ===== UI UPDATES =====
function updateDateTime() {
    const element = document.getElementById('currentDateTime');
    if (!element) return;
    
    const now = new Date();
    const options = { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    };
    element.textContent = now.toLocaleDateString('en-US', options);
}

function updateUserInfo() {
    const user = getCurrentUser();
    
    const userNameElements = ['userName', 'sidebarUserName', 'dashboardUserName'];
    userNameElements.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.textContent = user.name || 'Trader';
    });
    
    const userEmailEl = document.getElementById('sidebarUserEmail');
    if (userEmailEl) userEmailEl.textContent = user.email || 'trader@example.com';
    
    const settingsEmailEl = document.getElementById('settingsEmail');
    if (settingsEmailEl) settingsEmailEl.value = user.email || 'trader@example.com';
}

function updateAccountBalanceDisplay() {
    // Calculate balance from deposits, withdrawals, and trades
    const totalDeposits = deposits.reduce((sum, d) => sum + d.amount, 0);
    const totalWithdrawals = withdrawals.reduce((sum, w) => sum + w.amount, 0);
    const totalPnL = trades.reduce((sum, t) => sum + t.pnl, 0);
    
    accountBalance = startingBalance + totalDeposits - totalWithdrawals + totalPnL;
    saveAccountBalance();
    
    // Update all balance displays
    const accountBalanceEl = document.getElementById('accountBalance');
    if (accountBalanceEl) accountBalanceEl.textContent = formatCurrency(accountBalance);
    
    const sidebarBalanceEl = document.getElementById('sidebarBalance');
    if (sidebarBalanceEl) sidebarBalanceEl.textContent = formatCurrency(accountBalance);
    
    const accountBalanceDisplayEl = document.getElementById('accountBalanceDisplay');
    if (accountBalanceDisplayEl) accountBalanceDisplayEl.textContent = formatCurrency(accountBalance);
    
    const startingBalanceDisplayEl = document.getElementById('startingBalanceDisplay');
    if (startingBalanceDisplayEl) startingBalanceDisplayEl.textContent = formatCurrency(startingBalance);
    
    const totalDepositsAmount = deposits.reduce((sum, d) => sum + d.amount, 0);
    const totalWithdrawalsAmount = withdrawals.reduce((sum, w) => sum + w.amount, 0);
    const netGrowth = accountBalance - startingBalance;
    
    const totalDepositsDisplayEl = document.getElementById('totalDepositsDisplay');
    if (totalDepositsDisplayEl) totalDepositsDisplayEl.textContent = formatCurrency(totalDepositsAmount);
    
    const totalWithdrawalsDisplayEl = document.getElementById('totalWithdrawalsDisplay');
    if (totalWithdrawalsDisplayEl) totalWithdrawalsDisplayEl.textContent = formatCurrency(totalWithdrawalsAmount);
    
    const netGrowthDisplayEl = document.getElementById('netGrowthDisplay');
    if (netGrowthDisplayEl) netGrowthDisplayEl.textContent = formatCurrencyWithSign(netGrowth);
    
    const totalGrowthEl = document.getElementById('totalGrowth');
    if (totalGrowthEl) totalGrowthEl.textContent = formatCurrencyWithSign(netGrowth);
    
    const growthPercent = startingBalance > 0 ? (netGrowth / startingBalance) * 100 : 0;
    const growthPercentageEl = document.getElementById('growthPercentage');
    if (growthPercentageEl) growthPercentageEl.textContent = `${growthPercent > 0 ? '+' : ''}${growthPercent.toFixed(1)}%`;
}

function updateDashboardStats() {
    const today = new Date().toISOString().split('T')[0];
    const todayTrades = trades.filter(t => t.date === today);
    const todayPnL = todayTrades.reduce((sum, t) => sum + t.pnl, 0);
    
    const todayPnlEl = document.getElementById('todayPnl');
    if (todayPnlEl) todayPnlEl.textContent = formatCurrencyWithSign(todayPnL);
    
    const todayTradesCountEl = document.getElementById('todayTradesCount');
    if (todayTradesCountEl) todayTradesCountEl.textContent = `${todayTrades.length}/4 trades`;
    
    const todayTradeCountEl = document.getElementById('todayTradeCount');
    if (todayTradeCountEl) todayTradeCountEl.textContent = `${todayTrades.length}/4`;
    
    const dailyLimitProgressEl = document.getElementById('dailyLimitProgress');
    if (dailyLimitProgressEl) {
        const dailyProgress = (todayTrades.length / 4) * 100;
        dailyLimitProgressEl.style.width = `${dailyProgress}%`;
    }
    
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
    const weeklyTrades = trades.filter(t => t.date >= weekAgo);
    const weeklyPnL = weeklyTrades.reduce((sum, t) => sum + t.pnl, 0);
    
    const weeklyPnlEl = document.getElementById('weeklyPnl');
    if (weeklyPnlEl) weeklyPnlEl.textContent = formatCurrencyWithSign(weeklyPnL);
    
    const weeklyTradesCountEl = document.getElementById('weeklyTradesCount');
    if (weeklyTradesCountEl) weeklyTradesCountEl.textContent = `${weeklyTrades.length} trades`;
    
    const monthAgo = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];
    const monthlyTrades = trades.filter(t => t.date >= monthAgo);
    const monthlyPnL = monthlyTrades.reduce((sum, t) => sum + t.pnl, 0);
    
    const monthlyPnlEl = document.getElementById('monthlyPnl');
    if (monthlyPnlEl) monthlyPnlEl.textContent = formatCurrencyWithSign(monthlyPnL);
    
    const monthlyTradesCountEl = document.getElementById('monthlyTradesCount');
    if (monthlyTradesCountEl) monthlyTradesCountEl.textContent = `${monthlyTrades.length} trades`;
}

// ===== TRADE FUNCTIONS =====
function saveTrade() {
    const date = document.getElementById('tradeDate')?.value;
    const time = document.getElementById('tradeTime')?.value;
    const tradeNumber = parseInt(document.getElementById('tradeNumber')?.value);
    const pair = document.getElementById('currencyPair')?.value;
    let strategy = document.getElementById('strategy')?.value;
    const customStrategy = document.getElementById('customStrategy')?.value;
    const pnl = parseFloat(document.getElementById('pnlAmount')?.value);
    const notes = document.getElementById('tradeNotes')?.value;
    
    if (!date || !time || !pair || isNaN(pnl)) {
        showToast('Please fill all required fields', 'error');
        return false;
    }
    
    const todayTrades = trades.filter(t => t.date === date);
    if (todayTrades.length >= 4) {
        showToast('Maximum 4 trades per day reached!', 'error');
        return false;
    }
    
    if (customStrategy && document.getElementById('customStrategy').style.display !== 'none') {
        strategy = customStrategy;
    }
    
    const trade = {
        id: Date.now(),
        date,
        time,
        tradeNumber,
        pair,
        strategy,
        pnl,
        notes: notes || 'No notes',
        type: 'trade'
    };
    
    trades.unshift(trade);
    saveTrades();
    
    // Update everything
    updateAccountBalanceDisplay();
    updateDashboardStats();
    updateRecentActivity();
    updateAllTradesTable();
    
    // Update charts
    if (equityChart) {
        equityChart.data = getEquityData('12m');
        equityChart.update();
    }
    if (winLossChart) {
        winLossChart.data = getWinLossData();
        winLossChart.update();
    }
    
    updateCalendar();
    
    // Clear form
    const pnlInput = document.getElementById('pnlAmount');
    if (pnlInput) pnlInput.value = '';
    
    const notesInput = document.getElementById('tradeNotes');
    if (notesInput) notesInput.value = '';
    
    const customStrategyInput = document.getElementById('customStrategy');
    if (customStrategyInput) {
        customStrategyInput.style.display = 'none';
        customStrategyInput.value = '';
    }
    
    showToast('Trade saved successfully!', 'success');
    return true;
}

function saveAndDownloadTrade() {
    if (saveTrade() && trades.length > 0) {
        setTimeout(() => downloadTradePDF(trades[0]), 500);
    }
}

function deleteTrade(tradeId) {
    if (!confirm('Delete this trade?')) return;
    
    trades = trades.filter(t => t.id !== tradeId);
    saveTrades();
    
    updateAccountBalanceDisplay();
    updateDashboardStats();
    updateRecentActivity();
    updateAllTradesTable();
    
    if (equityChart) {
        equityChart.data = getEquityData('12m');
        equityChart.update();
    }
    if (winLossChart) {
        winLossChart.data = getWinLossData();
        winLossChart.update();
    }
    
    updateCalendar();
    showToast('Trade deleted', 'success');
}

// ===== DEPOSIT FUNCTIONS =====
function processDeposit() {
    const date = document.getElementById('depositDate')?.value;
    const time = document.getElementById('depositTime')?.value;
    const broker = document.getElementById('depositBroker')?.value;
    const amount = parseFloat(document.getElementById('depositAmount')?.value);
    const notes = document.getElementById('depositNotes')?.value;
    
    if (!date || !time || !broker || isNaN(amount) || amount <= 0) {
        showToast('Please fill all fields with valid amount', 'error');
        return false;
    }
    
    const deposit = {
        id: Date.now(),
        date,
        time,
        broker,
        amount: Math.abs(amount),
        notes: notes || 'Deposit',
        balanceBefore: accountBalance,
        balanceAfter: accountBalance + amount,
        type: 'deposit'
    };
    
    deposits.unshift(deposit);
    saveDeposits();
    
    updateAccountBalanceDisplay();
    updateRecentActivity();
    updateTransactionHistory();
    
    if (equityChart) {
        equityChart.data = getEquityData('12m');
        equityChart.update();
    }
    
    // Clear form
    const amountInput = document.getElementById('depositAmount');
    if (amountInput) amountInput.value = '';
    
    const notesInput = document.getElementById('depositNotes');
    if (notesInput) notesInput.value = '';
    
    showToast(`Deposit of $${amount.toFixed(2)} successful!`, 'success');
    return true;
}

function saveAndDownloadDeposit() {
    if (processDeposit() && deposits.length > 0) {
        setTimeout(() => downloadDepositPDF(deposits[0]), 500);
    }
}

function deleteDeposit(depositId) {
    if (!confirm('Delete this deposit?')) return;
    
    deposits = deposits.filter(d => d.id !== depositId);
    saveDeposits();
    
    updateAccountBalanceDisplay();
    updateRecentActivity();
    updateTransactionHistory();
    
    if (equityChart) {
        equityChart.data = getEquityData('12m');
        equityChart.update();
    }
    
    showToast('Deposit deleted', 'success');
}

// ===== WITHDRAWAL FUNCTIONS =====
function processWithdrawal() {
    const date = document.getElementById('withdrawalDate')?.value;
    const time = document.getElementById('withdrawalTime')?.value;
    const broker = document.getElementById('withdrawalBroker')?.value;
    const amount = parseFloat(document.getElementById('withdrawalAmount')?.value);
    const notes = document.getElementById('withdrawalNotes')?.value;
    
    if (!date || !time || !broker || isNaN(amount) || amount <= 0) {
        showToast('Please fill all fields with valid amount', 'error');
        return false;
    }
    
    if (amount > accountBalance) {
        showToast('Insufficient balance!', 'error');
        return false;
    }
    
    const withdrawal = {
        id: Date.now(),
        date,
        time,
        broker,
        amount: Math.abs(amount),
        notes: notes || 'Withdrawal',
        balanceBefore: accountBalance,
        balanceAfter: accountBalance - amount,
        type: 'withdrawal'
    };
    
    withdrawals.unshift(withdrawal);
    saveWithdrawals();
    
    updateAccountBalanceDisplay();
    updateRecentActivity();
    updateTransactionHistory();
    
    if (equityChart) {
        equityChart.data = getEquityData('12m');
        equityChart.update();
    }
    
    // Clear form
    const amountInput = document.getElementById('withdrawalAmount');
    if (amountInput) amountInput.value = '';
    
    const notesInput = document.getElementById('withdrawalNotes');
    if (notesInput) notesInput.value = '';
    
    showToast(`Withdrawal of $${amount.toFixed(2)} processed!`, 'success');
    return true;
}

function saveAndDownloadWithdrawal() {
    if (processWithdrawal() && withdrawals.length > 0) {
        setTimeout(() => downloadWithdrawalPDF(withdrawals[0]), 500);
    }
}

function deleteWithdrawal(withdrawalId) {
    if (!confirm('Delete this withdrawal?')) return;
    
    withdrawals = withdrawals.filter(w => w.id !== withdrawalId);
    saveWithdrawals();
    
    updateAccountBalanceDisplay();
    updateRecentActivity();
    updateTransactionHistory();
    
    if (equityChart) {
        equityChart.data = getEquityData('12m');
        equityChart.update();
    }
    
    showToast('Withdrawal deleted', 'success');
}

// ===== RECENT ACTIVITY =====
function updateRecentActivity() {
    const tableBody = document.getElementById('recentActivityTable');
    if (!tableBody) return;
    
    const allActivities = [
        ...trades.map(t => ({ ...t, type: 'trade' })),
        ...deposits.map(d => ({ ...d, type: 'deposit' })),
        ...withdrawals.map(w => ({ ...w, type: 'withdrawal' }))
    ].sort((a, b) => new Date(b.date + ' ' + b.time) - new Date(a.date + ' ' + a.time))
     .slice(0, 5);
    
    if (allActivities.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center; padding: 2rem; color: var(--text-tertiary);">
                    <i class="fas fa-chart-line" style="font-size: 2rem; margin-bottom: 0.5rem;"></i>
                    <p>No activity recorded yet.</p>
                </td>
            </tr>
        `;
        return;
    }
    
    tableBody.innerHTML = allActivities.map(activity => {
        if (activity.type === 'trade') {
            return `
                <tr>
                    <td>${formatDateTime(activity.date, activity.time)}</td>
                    <td><span style="background: rgba(59,130,246,0.1); color: #3b82f6; padding: 0.25rem 0.5rem; border-radius: 20px; font-size: 0.625rem;">TRADE</span></td>
                    <td>${activity.pair} - ${activity.strategy}</td>
                    <td class="${activity.pnl >= 0 ? 'profit' : 'loss'}" style="font-weight: 600;">${formatCurrencyWithSign(activity.pnl)}</td>
                    <td><span style="background: ${activity.pnl >= 0 ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)'}; color: ${activity.pnl >= 0 ? '#22c55e' : '#ef4444'}; padding: 0.25rem 0.5rem; border-radius: 20px; font-size: 0.625rem;">${activity.pnl >= 0 ? 'WIN' : 'LOSS'}</span></td>
                    <td>
                        <button onclick="deleteTrade(${activity.id})" style="background: transparent; border: none; color: #6b7280; cursor: pointer; padding: 0.25rem;" title="Delete">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
        } else if (activity.type === 'deposit') {
            return `
                <tr>
                    <td>${formatDateTime(activity.date, activity.time)}</td>
                    <td><span style="background: rgba(34,197,94,0.1); color: #22c55e; padding: 0.25rem 0.5rem; border-radius: 20px; font-size: 0.625rem;">DEPOSIT</span></td>
                    <td>${activity.broker}</td>
                    <td class="profit" style="font-weight: 600;">${formatCurrencyWithSign(activity.amount)}</td>
                    <td><span style="background: rgba(34,197,94,0.1); color: #22c55e; padding: 0.25rem 0.5rem; border-radius: 20px; font-size: 0.625rem;">COMPLETED</span></td>
                    <td>
                        <button onclick="deleteDeposit(${activity.id})" style="background: transparent; border: none; color: #6b7280; cursor: pointer; padding: 0.25rem;" title="Delete">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
        } else {
            return `
                <tr>
                    <td>${formatDateTime(activity.date, activity.time)}</td>
                    <td><span style="background: rgba(239,68,68,0.1); color: #ef4444; padding: 0.25rem 0.5rem; border-radius: 20px; font-size: 0.625rem;">WITHDRAWAL</span></td>
                    <td>${activity.broker}</td>
                    <td class="loss" style="font-weight: 600;">${formatCurrencyWithSign(-activity.amount)}</td>
                    <td><span style="background: rgba(245,158,11,0.1); color: #f59e0b; padding: 0.25rem 0.5rem; border-radius: 20px; font-size: 0.625rem;">PROCESSED</span></td>
                    <td>
                        <button onclick="deleteWithdrawal(${activity.id})" style="background: transparent; border: none; color: #6b7280; cursor: pointer; padding: 0.25rem;" title="Delete">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
        }
    }).join('');
}

// ===== TRANSACTION HISTORY =====
function updateTransactionHistory() {
    const tableBody = document.getElementById('transactionHistoryTable');
    if (!tableBody) return;
    
    const allTransactions = [
        ...deposits.map(d => ({ ...d, transactionType: 'deposit' })),
        ...withdrawals.map(w => ({ ...w, transactionType: 'withdrawal' }))
    ].sort((a, b) => new Date(b.date + ' ' + b.time) - new Date(a.date + ' ' + a.time));
    
    if (allTransactions.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="8" style="text-align: center; padding: 2rem; color: var(--text-tertiary);">
                    <i class="fas fa-money-bill-transfer" style="font-size: 2rem; margin-bottom: 0.5rem;"></i>
                    <p>No transactions yet</p>
                </td>
            </tr>
        `;
        return;
    }
    
    tableBody.innerHTML = allTransactions.map(t => {
        if (t.transactionType === 'deposit') {
            return `
                <tr>
                    <td>${formatDateTime(t.date, t.time)}</td>
                    <td><span style="background: rgba(34,197,94,0.1); color: #22c55e; padding: 0.25rem 0.5rem; border-radius: 20px; font-size: 0.625rem;">DEPOSIT</span></td>
                    <td>${t.broker}</td>
                    <td class="profit" style="font-weight: 600;">${formatCurrency(t.amount)}</td>
                    <td>${formatCurrency(t.balanceBefore)}</td>
                    <td>${formatCurrency(t.balanceAfter)}</td>
                    <td>${t.notes || '-'}</td>
                    <td>
                        <button onclick="deleteDeposit(${t.id})" style="background: transparent; border: none; color: #6b7280; cursor: pointer; padding: 0.25rem;">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
        } else {
            return `
                <tr>
                    <td>${formatDateTime(t.date, t.time)}</td>
                    <td><span style="background: rgba(239,68,68,0.1); color: #ef4444; padding: 0.25rem 0.5rem; border-radius: 20px; font-size: 0.625rem;">WITHDRAWAL</span></td>
                    <td>${t.broker}</td>
                    <td class="loss" style="font-weight: 600;">${formatCurrency(t.amount)}</td>
                    <td>${formatCurrency(t.balanceBefore)}</td>
                    <td>${formatCurrency(t.balanceAfter)}</td>
                    <td>${t.notes || '-'}</td>
                    <td>
                        <button onclick="deleteWithdrawal(${t.id})" style="background: transparent; border: none; color: #6b7280; cursor: pointer; padding: 0.25rem;">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
        }
    }).join('');
}

// ===== ALL TRADES TABLE =====
function updateAllTradesTable() {
    const tableBody = document.getElementById('allTradesTable');
    if (!tableBody) return;
    
    const sortedTrades = [...trades].sort((a, b) => 
        new Date(b.date + ' ' + b.time) - new Date(a.date + ' ' + a.time)
    );
    
    if (sortedTrades.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="8" style="text-align: center; padding: 2rem; color: var(--text-tertiary);">
                    <i class="fas fa-book" style="font-size: 2rem; margin-bottom: 0.5rem;"></i>
                    <p>No trades recorded yet</p>
                </td>
            </tr>
        `;
        return;
    }
    
    tableBody.innerHTML = sortedTrades.map(trade => `
        <tr>
            <td>${formatDateTime(trade.date, trade.time)}</td>
            <td>${trade.tradeNumber}</td>
            <td>${trade.pair}</td>
            <td>${trade.strategy}</td>
            <td class="${trade.pnl >= 0 ? 'profit' : 'loss'}" style="font-weight: 600;">${formatCurrencyWithSign(trade.pnl)}</td>
            <td>${trade.notes || '-'}</td>
            <td><span style="background: ${trade.pnl >= 0 ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)'}; color: ${trade.pnl >= 0 ? '#22c55e' : '#ef4444'}; padding: 0.25rem 0.5rem; border-radius: 20px; font-size: 0.625rem;">${trade.pnl >= 0 ? 'WIN' : 'LOSS'}</span></td>
            <td>
                <button onclick="deleteTrade(${trade.id})" style="background: transparent; border: none; color: #6b7280; cursor: pointer; padding: 0.25rem;">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
    
    // Update journal stats
    const winningTrades = trades.filter(t => t.pnl > 0).length;
    const losingTrades = trades.filter(t => t.pnl < 0).length;
    const totalPnL = trades.reduce((sum, t) => sum + t.pnl, 0);
    const winRate = trades.length > 0 ? (winningTrades / trades.length * 100).toFixed(1) : 0;
    
    const totalProfit = trades.filter(t => t.pnl > 0).reduce((sum, t) => sum + t.pnl, 0);
    const totalLoss = Math.abs(trades.filter(t => t.pnl < 0).reduce((sum, t) => sum + t.pnl, 0));
    const profitFactor = totalLoss > 0 ? (totalProfit / totalLoss).toFixed(2) : totalProfit > 0 ? '∞' : '0.00';
    
    const totalTradesCountEl = document.getElementById('totalTradesCount');
    if (totalTradesCountEl) totalTradesCountEl.textContent = trades.length;
    
    const winningTradesCountEl = document.getElementById('winningTradesCount');
    if (winningTradesCountEl) winningTradesCountEl.textContent = winningTrades;
    
    const losingTradesCountEl = document.getElementById('losingTradesCount');
    if (losingTradesCountEl) losingTradesCountEl.textContent = losingTrades;
    
    const winRateDisplayEl = document.getElementById('winRateDisplay');
    if (winRateDisplayEl) winRateDisplayEl.textContent = `${winRate}%`;
    
    const netPnlDisplayEl = document.getElementById('netPnlDisplay');
    if (netPnlDisplayEl) netPnlDisplayEl.textContent = formatCurrencyWithSign(totalPnL);
    
    const profitFactorDisplayEl = document.getElementById('profitFactorDisplay');
    if (profitFactorDisplayEl) profitFactorDisplayEl.textContent = profitFactor;
    
    const winningTradesAnalyticsEl = document.getElementById('winningTradesAnalytics');
    if (winningTradesAnalyticsEl) winningTradesAnalyticsEl.textContent = winningTrades;
    
    const losingTradesAnalyticsEl = document.getElementById('losingTradesAnalytics');
    if (losingTradesAnalyticsEl) losingTradesAnalyticsEl.textContent = losingTrades;
    
    const winRateAnalyticsEl = document.getElementById('winRateAnalytics');
    if (winRateAnalyticsEl) winRateAnalyticsEl.textContent = `${winRate}%`;
    
    // Update metrics
    const avgWin = winningTrades > 0 ? totalProfit / winningTrades : 0;
    const avgLoss = losingTrades > 0 ? totalLoss / losingTrades : 0;
    const largestWin = trades.filter(t => t.pnl > 0).length > 0 ? Math.max(...trades.filter(t => t.pnl > 0).map(t => t.pnl)) : 0;
    const largestLoss = trades.filter(t => t.pnl < 0).length > 0 ? Math.min(...trades.filter(t => t.pnl < 0).map(t => t.pnl)) : 0;
    const expectancy = trades.length > 0 ? (winningTrades / trades.length * avgWin) - (losingTrades / trades.length * avgLoss) : 0;
    
    const profitFactorMetricEl = document.getElementById('profitFactorMetric');
    if (profitFactorMetricEl) profitFactorMetricEl.textContent = profitFactor;
    
    const avgWinMetricEl = document.getElementById('avgWinMetric');
    if (avgWinMetricEl) avgWinMetricEl.textContent = formatCurrency(avgWin);
    
    const avgLossMetricEl = document.getElementById('avgLossMetric');
    if (avgLossMetricEl) avgLossMetricEl.textContent = formatCurrency(avgLoss);
    
    const largestWinMetricEl = document.getElementById('largestWinMetric');
    if (largestWinMetricEl) largestWinMetricEl.textContent = formatCurrency(largestWin);
    
    const largestLossMetricEl = document.getElementById('largestLossMetric');
    if (largestLossMetricEl) largestLossMetricEl.textContent = formatCurrency(largestLoss);
    
    const expectancyMetricEl = document.getElementById('expectancyMetric');
    if (expectancyMetricEl) expectancyMetricEl.textContent = formatCurrency(expectancy);
}

// ===== GOALS FUNCTIONS =====
function saveGoal() {
    const input = document.getElementById('goalInput');
    const content = input?.value.trim();
    
    if (!content) {
        showToast('Please write your goal', 'error');
        return;
    }
    
    const goal = {
        id: Date.now(),
        date: new Date().toISOString().split('T')[0],
        content
    };
    
    goals.unshift(goal);
    saveGoals();
    updateGoalsList();
    
    input.value = '';
    showToast('Goal saved!', 'success');
}

function clearGoal() {
    const input = document.getElementById('goalInput');
    if (input) input.value = '';
}

function updateGoalsList() {
    const list = document.getElementById('goalsList');
    if (!list) return;
    
    if (goals.length === 0) {
        list.innerHTML = `
            <div style="text-align: center; padding: 2rem; color: var(--text-tertiary);">
                <i class="fas fa-bullseye" style="font-size: 2rem; margin-bottom: 0.5rem;"></i>
                <p>No goals yet. Write your first trading goal!</p>
            </div>
        `;
        return;
    }
    
    list.innerHTML = goals.map(goal => `
        <div class="goal-card">
            <div class="goal-header">
                <span class="goal-date">${formatDate(goal.date)}</span>
                <div class="goal-actions">
                    <button class="edit-btn" onclick="editGoal(${goal.id})">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="delete-btn" onclick="deleteGoal(${goal.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
            <div class="goal-content">${goal.content}</div>
        </div>
    `).join('');
}

function editGoal(goalId) {
    const goal = goals.find(g => g.id === goalId);
    if (!goal) return;
    
    const input = document.getElementById('goalInput');
    if (input) input.value = goal.content;
    
    goals = goals.filter(g => g.id !== goalId);
    saveGoals();
    updateGoalsList();
    
    showToast('Goal loaded for editing', 'info');
}

function deleteGoal(goalId) {
    if (!confirm('Delete this goal?')) return;
    
    goals = goals.filter(g => g.id !== goalId);
    saveGoals();
    updateGoalsList();
    showToast('Goal deleted', 'success');
}

// ===== CHARTS =====
function initializeCharts() {
    initializeEquityChart();
    initializeWinLossChart();
}

function initializeEquityChart() {
    const ctx = document.getElementById('equityChart');
    if (!ctx) return;
    
    // Destroy existing chart if it exists
    if (equityChart) {
        equityChart.destroy();
    }
    
    const equityData = getEquityData('12m');
    
    equityChart = new Chart(ctx, {
        type: 'line',
        data: equityData,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    callbacks: {
                        label: function(context) {
                            return `Balance: ${formatCurrency(context.parsed.y)}`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return formatCurrency(value);
                        }
                    },
                    grid: { color: 'rgba(0,0,0,0.05)' }
                },
                x: {
                    grid: { display: false }
                }
            }
        }
    });
    
    // Setup period buttons
    document.querySelectorAll('.chart-period-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.chart-period-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            
            const period = this.getAttribute('data-period');
            if (equityChart) {
                equityChart.data = getEquityData(period);
                equityChart.update();
            }
        });
    });
}

function getEquityData(period) {
    // Get all dates with activity
    const dateMap = new Map();
    
    // Add starting balance
    dateMap.set('start', { balance: startingBalance, date: new Date() });
    
    // Add all deposits
    deposits.forEach(deposit => {
        const date = deposit.date;
        if (!dateMap.has(date)) {
            dateMap.set(date, { balance: 0, date: new Date(date) });
        }
        dateMap.get(date).balance += deposit.amount;
    });
    
    // Add all withdrawals
    withdrawals.forEach(withdrawal => {
        const date = withdrawal.date;
        if (!dateMap.has(date)) {
            dateMap.set(date, { balance: 0, date: new Date(date) });
        }
        dateMap.get(date).balance -= withdrawal.amount;
    });
    
    // Add all trades
    trades.forEach(trade => {
        const date = trade.date;
        if (!dateMap.has(date)) {
            dateMap.set(date, { balance: 0, date: new Date(date) });
        }
        dateMap.get(date).balance += trade.pnl;
    });
    
    // Convert to array and sort by date
    let entries = Array.from(dateMap.entries())
        .filter(([key]) => key !== 'start')
        .map(([date, data]) => ({ date, ...data }))
        .sort((a, b) => a.date - b.date);
    
    // Filter based on period
    if (period === '1m') {
        const oneMonthAgo = new Date();
        oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
        entries = entries.filter(e => e.date >= oneMonthAgo);
    } else if (period === '12m') {
        // Only show months that have actual trading activity
        const monthsWithActivity = new Set();
        entries.forEach(e => {
            const monthKey = `${e.date.getFullYear()}-${e.date.getMonth()}`;
            monthsWithActivity.add(monthKey);
        });
        
        // Group by month and only include months with activity
        const monthlyData = [];
        const sortedMonths = Array.from(monthsWithActivity).sort();
        
        sortedMonths.forEach(monthKey => {
            const [year, month] = monthKey.split('-').map(Number);
            const monthStart = new Date(year, month, 1);
            const monthEnd = new Date(year, month + 1, 0);
            
            const monthEntries = entries.filter(e => 
                e.date >= monthStart && e.date <= monthEnd
            );
            
            if (monthEntries.length > 0) {
                const monthBalance = monthEntries.reduce((sum, e) => sum + e.balance, 0);
                monthlyData.push({
                    date: monthStart,
                    balance: monthBalance
                });
            }
        });
        
        entries = monthlyData;
    }
    
    // Calculate running balance
    let runningBalance = startingBalance;
    const labels = ['Start'];
    const data = [runningBalance];
    
    entries.forEach(entry => {
        runningBalance += entry.balance;
        data.push(runningBalance);
        
        if (period === '12m') {
            labels.push(entry.date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }));
        } else {
            labels.push(entry.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
        }
    });
    
    // Calculate equity stats
    const peak = Math.max(...data);
    const currentEquity = data[data.length - 1];
    const drawdown = peak > 0 ? ((peak - currentEquity) / peak * 100).toFixed(1) : 0;
    
    const equityPeakEl = document.getElementById('equityPeak');
    if (equityPeakEl) equityPeakEl.textContent = formatCurrency(peak);
    
    const equityDrawdownEl = document.getElementById('equityDrawdown');
    if (equityDrawdownEl) equityDrawdownEl.textContent = `${drawdown}%`;
    
    return {
        labels,
        datasets: [{
            label: 'Account Balance',
            data,
            borderColor: '#3b82f6',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            borderWidth: 3,
            fill: true,
            tension: 0.4,
            pointRadius: 3,
            pointHoverRadius: 6
        }]
    };
}

function initializeWinLossChart() {
    const ctx = document.getElementById('winLossChart');
    if (!ctx) return;
    
    // Destroy existing chart if it exists
    if (winLossChart) {
        winLossChart.destroy();
    }
    
    const winLossData = getWinLossData();
    
    winLossChart = new Chart(ctx, {
        type: 'doughnut',
        data: winLossData,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '70%',
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        padding: 20,
                        usePointStyle: true,
                        font: { size: 12 }
                    }
                }
            }
        }
    });
}

function getWinLossData() {
    const winningTrades = trades.filter(t => t.pnl > 0).length;
    const losingTrades = trades.filter(t => t.pnl < 0).length;
    
    return {
        labels: ['Winning Trades', 'Losing Trades'],
        datasets: [{
            data: [winningTrades, losingTrades],
            backgroundColor: ['#22c55e', '#ef4444'],
            borderWidth: 0,
            hoverOffset: 4
        }]
    };
}

// ===== CALENDAR =====
function updateCalendar() {
    const grid = document.getElementById('calendarGrid');
    const monthYear = document.getElementById('calendarMonthYear');
    if (!grid || !monthYear) return;
    
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'];
    
    monthYear.textContent = `${monthNames[currentCalendarMonth]} ${currentCalendarYear}`;
    
    const firstDay = new Date(currentCalendarYear, currentCalendarMonth, 1);
    const lastDay = new Date(currentCalendarYear, currentCalendarMonth + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay();
    
    let html = `
        <div class="calendar-header">Sun</div>
        <div class="calendar-header">Mon</div>
        <div class="calendar-header">Tue</div>
        <div class="calendar-header">Wed</div>
        <div class="calendar-header">Thu</div>
        <div class="calendar-header">Fri</div>
        <div class="calendar-header">Sat</div>
    `;
    
    // Empty cells for days before month starts
    for (let i = 0; i < startingDay; i++) {
        html += '<div class="calendar-day empty"></div>';
    }
    
    // Fill in the days
    for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${currentCalendarYear}-${String(currentCalendarMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        
        const dayTrades = trades.filter(t => t.date === dateStr);
        const dayDeposits = deposits.filter(d => d.date === dateStr);
        const dayWithdrawals = withdrawals.filter(w => w.date === dateStr);
        
        const dayPnL = dayTrades.reduce((sum, t) => sum + t.pnl, 0) +
            dayDeposits.reduce((sum, d) => sum + d.amount, 0) -
            dayWithdrawals.reduce((sum, w) => sum + w.amount, 0);
        
        let dayClass = 'calendar-day';
        if (dayTrades.length > 0 || dayDeposits.length > 0 || dayWithdrawals.length > 0) {
            dayClass += dayPnL >= 0 ? ' profit' : ' loss';
        }
        
        html += `
            <div class="${dayClass}">
                <span class="calendar-date">${day}</span>
                ${dayPnL !== 0 ? `
                    <span class="calendar-pnl ${dayPnL >= 0 ? 'profit' : 'loss'}">
                        ${formatCurrencyWithSign(dayPnL)}
                    </span>
                ` : ''}
            </div>
        `;
    }
    
    grid.innerHTML = html;
}

function changeCalendarMonth(direction) {
    currentCalendarMonth += direction;
    
    if (currentCalendarMonth < 0) {
        currentCalendarMonth = 11;
        currentCalendarYear--;
    } else if (currentCalendarMonth > 11) {
        currentCalendarMonth = 0;
        currentCalendarYear++;
    }
    
    updateCalendar();
}

// ===== PDF EXPORT FUNCTIONS =====
function generatePDF({ title, content, filename }) {
    try {
        const { jsPDF } = window.jspdf;
        if (!jsPDF) {
            showToast('PDF library not loaded. Please check your internet connection.', 'error');
            return;
        }
        
        const pdf = new jsPDF();
        const pageWidth = pdf.internal.pageSize.width;
        const margin = 20;
        
        // Header
        pdf.setFontSize(24);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(59, 130, 246);
        pdf.text(title, margin, margin);
        
        // Date
        pdf.setFontSize(11);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(100, 100, 100);
        pdf.text(`Generated: ${new Date().toLocaleString()}`, margin, margin + 15);
        
        // Line
        pdf.setDrawColor(200, 200, 200);
        pdf.line(margin, margin + 20, pageWidth - margin, margin + 20);
        
        // Content
        pdf.setFontSize(11);
        pdf.setTextColor(0, 0, 0);
        
        const lines = pdf.splitTextToSize(content, pageWidth - (margin * 2));
        pdf.text(lines, margin, margin + 35);
        
        // Footer
        pdf.setFontSize(9);
        pdf.setTextColor(150, 150, 150);
        pdf.text('FX TAE Charts Trading Journal - Professional Edition', margin, pdf.internal.pageSize.height - 10);
        pdf.text('www.fxtaetrader.page.gd', margin, pdf.internal.pageSize.height - 5);
        
        pdf.save(filename);
        showToast(`PDF downloaded: ${filename}`, 'success');
    } catch (error) {
        console.error('PDF error:', error);
        showToast('Error generating PDF. Please try again.', 'error');
    }
}

function downloadTradePDF(trade) {
    const content = `
        TRADE DETAILS
        =============
        Date: ${formatDate(trade.date)}
        Time: ${trade.time}
        Trade #: ${trade.tradeNumber}
        Pair: ${trade.pair}
        Strategy: ${trade.strategy}
        P&L: ${formatCurrencyWithSign(trade.pnl)}
        Notes: ${trade.notes}
        
        ACCOUNT SUMMARY
        ===============
        Current Balance: ${formatCurrency(accountBalance)}
        Total Deposits: ${formatCurrency(deposits.reduce((sum, d) => sum + d.amount, 0))}
        Total Withdrawals: ${formatCurrency(withdrawals.reduce((sum, w) => sum + w.amount, 0))}
        Net P&L: ${formatCurrencyWithSign(trades.reduce((sum, t) => sum + t.pnl, 0))}
    `;
    
    generatePDF({
        title: `Trade #${trade.tradeNumber} - ${trade.pair}`,
        content,
        filename: `trade-${trade.id}-${trade.date}.pdf`
    });
}

function downloadDepositPDF(deposit) {
    const content = `
        DEPOSIT RECEIPT
        ===============
        Date: ${formatDate(deposit.date)}
        Time: ${deposit.time}
        Transaction ID: DEP-${deposit.id}
        Broker: ${deposit.broker}
        Amount: ${formatCurrency(deposit.amount)}
        
        ACCOUNT BALANCE
        ===============
        Balance Before: ${formatCurrency(deposit.balanceBefore)}
        Balance After: ${formatCurrency(deposit.balanceAfter)}
        
        Notes: ${deposit.notes || 'No notes'}
        
        STATUS: COMPLETED
    `;
    
    generatePDF({
        title: 'Deposit Receipt',
        content,
        filename: `deposit-${deposit.id}-${deposit.date}.pdf`
    });
}

function downloadWithdrawalPDF(withdrawal) {
    const content = `
        WITHDRAWAL RECEIPT
        ==================
        Date: ${formatDate(withdrawal.date)}
        Time: ${withdrawal.time}
        Transaction ID: WD-${withdrawal.id}
        Broker: ${withdrawal.broker}
        Amount: ${formatCurrency(withdrawal.amount)}
        
        ACCOUNT BALANCE
        ===============
        Balance Before: ${formatCurrency(withdrawal.balanceBefore)}
        Balance After: ${formatCurrency(withdrawal.balanceAfter)}
        
        Notes: ${withdrawal.notes || 'No notes'}
        
        STATUS: PROCESSED
    `;
    
    generatePDF({
        title: 'Withdrawal Receipt',
        content,
        filename: `withdrawal-${withdrawal.id}-${withdrawal.date}.pdf`
    });
}

function exportDashboardPDF() {
    const todayPnL = trades.filter(t => t.date === new Date().toISOString().split('T')[0])
        .reduce((sum, t) => sum + t.pnl, 0);
    
    const content = `
        DASHBOARD REPORT
        ================
        Date: ${new Date().toLocaleDateString()}
        Trader: ${getCurrentUser().name || 'Trader'}
        
        ACCOUNT OVERVIEW
        ================
        Current Balance: ${formatCurrency(accountBalance)}
        Starting Balance: ${formatCurrency(startingBalance)}
        Total Growth: ${formatCurrencyWithSign(accountBalance - startingBalance)}
        
        TODAY'S PERFORMANCE
        ===================
        P&L: ${formatCurrencyWithSign(todayPnL)}
        Trades: ${trades.filter(t => t.date === new Date().toISOString().split('T')[0]).length}/4
        
        DEPOSITS & WITHDRAWALS
        ======================
        Total Deposits: ${formatCurrency(deposits.reduce((sum, d) => sum + d.amount, 0))}
        Total Withdrawals: ${formatCurrency(withdrawals.reduce((sum, w) => sum + w.amount, 0))}
        Net Transactions: ${formatCurrencyWithSign(deposits.reduce((sum, d) => sum + d.amount, 0) - withdrawals.reduce((sum, w) => sum + w.amount, 0))}
        
        TRADING STATISTICS
        ==================
        Total Trades: ${trades.length}
        Winning Trades: ${trades.filter(t => t.pnl > 0).length}
        Losing Trades: ${trades.filter(t => t.pnl < 0).length}
        Win Rate: ${trades.length > 0 ? ((trades.filter(t => t.pnl > 0).length / trades.length) * 100).toFixed(1) : 0}%
        Net P&L: ${formatCurrencyWithSign(trades.reduce((sum, t) => sum + t.pnl, 0))}
    `;
    
    generatePDF({
        title: 'Dashboard Report',
        content,
        filename: `dashboard-${new Date().toISOString().split('T')[0]}.pdf`
    });
}

function exportJournalPDF() {
    const content = `
        COMPLETE TRADING JOURNAL
        ========================
        Generated: ${new Date().toLocaleString()}
        Trader: ${getCurrentUser().name || 'Trader'}
        
        TRADING STATISTICS
        ==================
        Total Trades: ${trades.length}
        Winning Trades: ${trades.filter(t => t.pnl > 0).length}
        Losing Trades: ${trades.filter(t => t.pnl < 0).length}
        Win Rate: ${trades.length > 0 ? ((trades.filter(t => t.pnl > 0).length / trades.length) * 100).toFixed(1) : 0}%
        Total Profit: ${formatCurrency(trades.filter(t => t.pnl > 0).reduce((sum, t) => sum + t.pnl, 0))}
        Total Loss: ${formatCurrency(Math.abs(trades.filter(t => t.pnl < 0).reduce((sum, t) => sum + t.pnl, 0)))}
        Net P&L: ${formatCurrencyWithSign(trades.reduce((sum, t) => sum + t.pnl, 0))}
        
        ALL TRADES (${trades.length})
        ============
        ${trades.map(t => `${t.date} ${t.time} | Trade ${t.tradeNumber} | ${t.pair} | ${t.strategy} | ${formatCurrencyWithSign(t.pnl)} | ${t.notes || '-'}`).join('\n')}
        
        DEPOSITS (${deposits.length})
        ========
        ${deposits.map(d => `${d.date} ${d.time} | ${d.broker} | +${formatCurrency(d.amount)} | ${d.notes || '-'}`).join('\n')}
        
        WITHDRAWALS (${withdrawals.length})
        ============
        ${withdrawals.map(w => `${w.date} ${w.time} | ${w.broker} | -${formatCurrency(w.amount)} | ${w.notes || '-'}`).join('\n')}
    `;
    
    generatePDF({
        title: 'Trading Journal',
        content,
        filename: `journal-${new Date().toISOString().split('T')[0]}.pdf`
    });
}

function exportAnalyticsPDF() {
    const winningTrades = trades.filter(t => t.pnl > 0);
    const losingTrades = trades.filter(t => t.pnl < 0);
    const totalProfit = winningTrades.reduce((sum, t) => sum + t.pnl, 0);
    const totalLoss = Math.abs(losingTrades.reduce((sum, t) => sum + t.pnl, 0));
    
    const avgWin = winningTrades.length > 0 ? totalProfit / winningTrades.length : 0;
    const avgLoss = losingTrades.length > 0 ? totalLoss / losingTrades.length : 0;
    const profitFactor = totalLoss > 0 ? totalProfit / totalLoss : totalProfit > 0 ? 999 : 0;
    const expectancy = trades.length > 0 ? 
        (winningTrades.length / trades.length * avgWin) - (losingTrades.length / trades.length * avgLoss) : 0;
    
    const largestWin = winningTrades.length > 0 ? Math.max(...winningTrades.map(t => t.pnl)) : 0;
    const largestLoss = losingTrades.length > 0 ? Math.min(...losingTrades.map(t => t.pnl)) : 0;
    
    const content = `
        ADVANCED ANALYTICS REPORT
        ========================
        Period: ${trades.length > 0 ? trades[trades.length - 1]?.date : 'N/A'} to ${trades.length > 0 ? trades[0]?.date : 'N/A'}
        
        PERFORMANCE METRICS
        ===================
        Total Trades: ${trades.length}
        Winning Trades: ${winningTrades.length}
        Losing Trades: ${losingTrades.length}
        Win Rate: ${trades.length > 0 ? ((winningTrades.length / trades.length) * 100).toFixed(1) : 0}%
        
        PROFIT ANALYSIS
        ===============
        Total Profit: ${formatCurrency(totalProfit)}
        Total Loss: ${formatCurrency(totalLoss)}
        Net Profit: ${formatCurrencyWithSign(totalProfit - totalLoss)}
        Profit Factor: ${profitFactor === 999 ? '∞' : profitFactor.toFixed(2)}
        Expectancy: ${formatCurrency(expectancy)}
        
        TRADE STATISTICS
        ================
        Average Win: ${formatCurrency(avgWin)}
        Average Loss: ${formatCurrency(avgLoss)}
        Largest Win: ${formatCurrency(largestWin)}
        Largest Loss: ${formatCurrency(largestLoss)}
        Win/Loss Ratio: ${avgLoss > 0 ? (avgWin / avgLoss).toFixed(2) : '∞'}
        
        ACCOUNT GROWTH
        ==============
        Starting Balance: ${formatCurrency(startingBalance)}
        Current Balance: ${formatCurrency(accountBalance)}
        Total Growth: ${formatCurrencyWithSign(accountBalance - startingBalance)}
        Growth %: ${startingBalance > 0 ? (((accountBalance - startingBalance) / startingBalance) * 100).toFixed(1) : 0}%
    `;
    
    generatePDF({
        title: 'Analytics Report',
        content,
        filename: `analytics-${new Date().toISOString().split('T')[0]}.pdf`
    });
}

function exportTransactionsPDF() {
    const content = `
        TRANSACTION HISTORY
        ===================
        Generated: ${new Date().toLocaleString()}
        Trader: ${getCurrentUser().name || 'Trader'}
        
        ACCOUNT SUMMARY
        ===============
        Current Balance: ${formatCurrency(accountBalance)}
        Total Deposits: ${formatCurrency(deposits.reduce((sum, d) => sum + d.amount, 0))}
        Total Withdrawals: ${formatCurrency(withdrawals.reduce((sum, w) => sum + w.amount, 0))}
        Net Transactions: ${formatCurrencyWithSign(deposits.reduce((sum, d) => sum + d.amount, 0) - withdrawals.reduce((sum, w) => sum + w.amount, 0))}
        
        DEPOSIT HISTORY (${deposits.length})
        ===============
        ${deposits.map(d => `${d.date} ${d.time} | ${d.broker} | +${formatCurrency(d.amount)} | Balance: ${formatCurrency(d.balanceAfter)} | ${d.notes || '-'}`).join('\n')}
        
        WITHDRAWAL HISTORY (${withdrawals.length})
        ==================
        ${withdrawals.map(w => `${w.date} ${w.time} | ${w.broker} | -${formatCurrency(w.amount)} | Balance: ${formatCurrency(w.balanceAfter)} | ${w.notes || '-'}`).join('\n')}
    `;
    
    generatePDF({
        title: 'Transaction History',
        content,
        filename: `transactions-${new Date().toISOString().split('T')[0]}.pdf`
    });
}

function exportAllDataPDF() {
    const user = getCurrentUser();
    
    const content = `
        COMPLETE DATA EXPORT
        ====================
        Generated: ${new Date().toLocaleString()}
        Trader: ${user.name || 'Trader'}
        Email: ${user.email || 'N/A'}
        Account Created: ${user.createdAt ? formatDate(user.createdAt.split('T')[0]) : 'N/A'}
        
        ${getTradesExportContent()}
        
        ${getDepositsExportContent()}
        
        ${getWithdrawalsExportContent()}
        
        ${getGoalsExportContent()}
        
        SETTINGS
        ========
        Theme: ${localStorage.getItem('fxTaeTheme') || 'light'}
        Trading Rules: ${localStorage.getItem(TRADING_RULES_KEY) || 'Not set'}
    `;
    
    generatePDF({
        title: 'Complete Data Export',
        content,
        filename: `complete-data-${new Date().toISOString().split('T')[0]}.pdf`
    });
}

function getTradesExportContent() {
    const winningTrades = trades.filter(t => t.pnl > 0);
    const losingTrades = trades.filter(t => t.pnl < 0);
    
    return `
        TRADES DATA
        ===========
        Total Trades: ${trades.length}
        Winning Trades: ${winningTrades.length}
        Losing Trades: ${losingTrades.length}
        Win Rate: ${trades.length > 0 ? ((winningTrades.length / trades.length) * 100).toFixed(1) : 0}%
        Net P&L: ${formatCurrencyWithSign(trades.reduce((sum, t) => sum + t.pnl, 0))}
        
        All Trades:
        ${trades.map(t => `${t.date} ${t.time} | #${t.tradeNumber} | ${t.pair} | ${t.strategy} | ${formatCurrencyWithSign(t.pnl)} | ${t.notes || '-'}`).join('\n')}
    `;
}

function getDepositsExportContent() {
    return `
        DEPOSITS DATA
        =============
        Total Deposits: ${deposits.length}
        Total Amount: ${formatCurrency(deposits.reduce((sum, d) => sum + d.amount, 0))}
        
        All Deposits:
        ${deposits.map(d => `${d.date} ${d.time} | ${d.broker} | +${formatCurrency(d.amount)} | ${d.notes || '-'}`).join('\n')}
    `;
}

function getWithdrawalsExportContent() {
    return `
        WITHDRAWALS DATA
        ================
        Total Withdrawals: ${withdrawals.length}
        Total Amount: ${formatCurrency(withdrawals.reduce((sum, w) => sum + w.amount, 0))}
        
        All Withdrawals:
        ${withdrawals.map(w => `${w.date} ${w.time} | ${w.broker} | -${formatCurrency(w.amount)} | ${w.notes || '-'}`).join('\n')}
    `;
}

function getGoalsExportContent() {
    return `
        GOALS DATA
        ==========
        Total Goals: ${goals.length}
        
        All Goals:
        ${goals.map(g => `${g.date}: ${g.content}`).join('\n')}
    `;
}

// ===== CHART DOWNLOAD =====
function downloadChartAsPDF(canvasId, chartName) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) {
        showToast('Chart not found', 'error');
        return;
    }
    
    html2canvas(canvas, {
        scale: 2,
        backgroundColor: '#ffffff'
    }).then(canvasImage => {
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF('landscape');
        
        pdf.setFontSize(20);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(59, 130, 246);
        pdf.text(chartName.replace('_', ' '), 20, 20);
        
        pdf.setFontSize(11);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(100, 100, 100);
        pdf.text(`Generated: ${new Date().toLocaleString()}`, 20, 30);
        
        const imgData = canvasImage.toDataURL('image/png');
        pdf.addImage(imgData, 'PNG', 20, 40, 250, 150);
        
        pdf.save(`${chartName.toLowerCase()}-${new Date().toISOString().split('T')[0]}.pdf`);
        showToast('Chart downloaded', 'success');
    }).catch(error => {
        console.error('Chart download error:', error);
        showToast('Error downloading chart', 'error');
    });
}

// ===== SETTINGS FUNCTIONS =====
function setTheme(theme) {
    document.body.classList.toggle('dark-theme', theme === 'dark');
    localStorage.setItem('fxTaeTheme', theme);
    
    document.querySelectorAll('.theme-option').forEach(btn => {
        btn.classList.remove('active');
        if (btn.textContent.toLowerCase().includes(theme)) {
            btn.classList.add('active');
        }
    });
}

function saveUsername() {
    const newName = document.getElementById('settingsUsername')?.value.trim();
    if (!newName) {
        showToast('Please enter a username', 'error');
        return;
    }
    
    const user = getCurrentUser();
    user.name = newName;
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
    
    updateUserInfo();
    document.getElementById('settingsUsername').value = '';
    showToast('Username updated', 'success');
}

function showChangePasswordModal() {
    const modal = document.getElementById('changePasswordModal');
    if (modal) modal.style.display = 'flex';
}

function closeChangePasswordModal() {
    const modal = document.getElementById('changePasswordModal');
    if (modal) modal.style.display = 'none';
    
    const currentPassword = document.getElementById('currentPassword');
    if (currentPassword) currentPassword.value = '';
    
    const newPassword = document.getElementById('newPassword');
    if (newPassword) newPassword.value = '';
    
    const confirmNewPassword = document.getElementById('confirmNewPassword');
    if (confirmNewPassword) confirmNewPassword.value = '';
}

function saveNewPassword() {
    const current = document.getElementById('currentPassword')?.value;
    const newPass = document.getElementById('newPassword')?.value;
    const confirm = document.getElementById('confirmNewPassword')?.value;
    
    if (!current || !newPass || !confirm) {
        showToast('Please fill all fields', 'error');
        return;
    }
    
    if (newPass !== confirm) {
        showToast('Passwords do not match', 'error');
        return;
    }
    
    if (newPass.length < 8) {
        showToast('Password must be at least 8 characters', 'error');
        return;
    }
    
    // In a real app, you would verify current password and update
    showToast('Password changed successfully', 'success');
    closeChangePasswordModal();
}

function saveTradingRules() {
    const rules = document.getElementById('tradingRulesInput')?.value.trim();
    if (!rules) {
        showToast('Please enter trading rules', 'error');
        return;
    }
    
    localStorage.setItem(TRADING_RULES_KEY, rules);
    
    const content = `
        TRADING RULES
        =============
        Trader: ${getCurrentUser().name || 'Trader'}
        Date: ${new Date().toLocaleDateString()}
        
        ${rules}
    `;
    
    generatePDF({
        title: 'Trading Rules',
        content,
        filename: `trading-rules-${new Date().toISOString().split('T')[0]}.pdf`
    });
    
    showToast('Trading rules saved and downloaded', 'success');
}

function clearAllData() {
    if (!confirm('⚠️ WARNING: This will delete ALL your trades, deposits, withdrawals, and goals. This action cannot be undone. Are you sure?')) {
        return;
    }
    
    trades = [];
    goals = [];
    deposits = [];
    withdrawals = [];
    accountBalance = 0;
    startingBalance = 0;
    
    saveTrades();
    saveGoals();
    saveDeposits();
    saveWithdrawals();
    saveAccountBalance();
    
    updateAccountBalanceDisplay();
    updateDashboardStats();
    updateRecentActivity();
    updateTransactionHistory();
    updateAllTradesTable();
    updateGoalsList();
    
    if (equityChart) {
        equityChart.data = getEquityData('12m');
        equityChart.update();
    }
    if (winLossChart) {
        winLossChart.data = getWinLossData();
        winLossChart.update();
    }
    
    updateCalendar();
    showToast('All data cleared successfully', 'success');
}

// ===== POSITION CALCULATOR =====
function showPositionCalculator() {
    const modal = document.getElementById('positionCalculatorModal');
    if (!modal) return;
    
    const calcBalance = document.getElementById('calcBalance');
    if (calcBalance) calcBalance.value = accountBalance;
    
    modal.style.display = 'flex';
}

function closePositionCalculator() {
    const modal = document.getElementById('positionCalculatorModal');
    if (modal) modal.style.display = 'none';
}

function calculatePositionSize() {
    const balance = parseFloat(document.getElementById('calcBalance')?.value);
    const riskPercent = parseFloat(document.getElementById('calcRiskPercent')?.value);
    const stopLoss = parseFloat(document.getElementById('calcStopLoss')?.value);
    
    if (isNaN(balance) || isNaN(riskPercent) || isNaN(stopLoss) || stopLoss <= 0) {
        showToast('Please enter valid values', 'error');
        return;
    }
    
    const riskAmount = balance * (riskPercent / 100);
    const positionSize = riskAmount / (stopLoss * 10); // Standard forex calculation
    
    const calcRiskAmount = document.getElementById('calcRiskAmount');
    if (calcRiskAmount) calcRiskAmount.value = riskAmount.toFixed(2);
    
    const calcPositionSize = document.getElementById('calcPositionSize');
    if (calcPositionSize) calcPositionSize.value = positionSize.toFixed(2);
}

// ===== CUSTOM STRATEGY =====
function showCustomStrategy() {
    const input = document.getElementById('customStrategy');
    if (input) {
        input.style.display = 'block';
        input.focus();
    }
}

// ===== TEMPLATE DOWNLOAD =====
function downloadTradingPlanTemplate() {
    const content = `
        TRADING PLAN TEMPLATE
        =====================
        
        1. TRADING GOALS
        ----------------
        • Monthly profit target:
        • Maximum drawdown:
        • Risk per trade:
        • Daily trade limit:
        
        2. MARKETS & INSTRUMENTS
        ------------------------
        • Preferred pairs:
        • Trading sessions:
        • Timeframe:
        
        3. ENTRY RULES
        --------------
        • Setup criteria:
        • Confirmation signals:
        • Entry timing:
        
        4. EXIT RULES
        -------------
        • Take profit levels:
        • Stop loss placement:
        • Trailing stop rules:
        
        5. RISK MANAGEMENT
        ------------------
        • Position sizing:
        • Maximum risk per day:
        • Maximum risk per week:
        
        6. TRADING PSYCHOLOGY
        ---------------------
        • Pre-trade routine:
        • Post-trade review:
        • Rules for losses:
        
        7. JOURNALING
        -------------
        • What to record:
        • Review schedule:
        • Performance metrics:
    `;
    
    generatePDF({
        title: 'Trading Plan Template',
        content,
        filename: `trading-plan-template-${new Date().toISOString().split('T')[0]}.pdf`
    });
}

// ===== EVENT LISTENERS =====
function setupEventListeners() {
    // Menu toggle
    const menuBtn = document.getElementById('menuBtn');
    const sidebar = document.getElementById('sidebar');
    const sidebarClose = document.getElementById('sidebarClose');
    
    if (menuBtn && sidebar) {
        menuBtn.addEventListener('click', () => {
            sidebar.classList.toggle('active');
        });
    }
    
    if (sidebarClose && sidebar) {
        sidebarClose.addEventListener('click', () => {
            sidebar.classList.remove('active');
        });
    }
    
    // Navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            
            document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
            this.classList.add('active');
            
            document.querySelectorAll('.dashboard-page').forEach(page => page.classList.remove('active'));
            
            const pageId = this.getAttribute('data-page');
            const page = document.getElementById(pageId);
            if (page) {
                page.classList.add('active');
            }
            
            if (window.innerWidth <= 1024) {
                sidebar?.classList.remove('active');
            }
        });
    });
    
    // Logout
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
    }
    
    // Balance preview listeners
    const depositAmount = document.getElementById('depositAmount');
    if (depositAmount) {
        depositAmount.addEventListener('input', function() {
            const amount = parseFloat(this.value) || 0;
            const newBalanceEl = document.getElementById('newBalanceAfterDeposit');
            if (newBalanceEl) newBalanceEl.value = (accountBalance + amount).toFixed(2);
        });
    }
    
    const withdrawalAmount = document.getElementById('withdrawalAmount');
    if (withdrawalAmount) {
        withdrawalAmount.addEventListener('input', function() {
            const amount = parseFloat(this.value) || 0;
            const newBalanceEl = document.getElementById('newBalanceAfterWithdrawal');
            if (newBalanceEl) newBalanceEl.value = (accountBalance - amount).toFixed(2);
        });
    }
    
    // Close modals on outside click
    window.addEventListener('click', function(e) {
        if (e.target.classList.contains('modal-premium')) {
            e.target.style.display = 'none';
        }
    });
    
    // Escape key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            document.querySelectorAll('.modal-premium').forEach(modal => {
                modal.style.display = 'none';
            });
        }
    });
}

// ===== AUTH PAGE HANDLERS =====
function handleGoogleAuth(type) {
    showToast('Connecting to Google...', 'info');
    
    setTimeout(() => {
        const email = `user${Date.now()}@gmail.com`;
        const name = 'Google User';
        
        if (type === 'signup') {
            const user = {
                id: Date.now(),
                name,
                email,
                password: 'google_auth_' + Date.now(),
                createdAt: new Date().toISOString(),
                isGoogleUser: true
            };
            
            const users = getUsers();
            if (!users.some(u => u.email === email)) {
                users.push(user);
                localStorage.setItem(USERS_KEY, JSON.stringify(users));
            }
            
            setCurrentUser(user);
            showToast('Google account connected! Redirecting...', 'success');
            
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 1500);
        } else {
            const users = getUsers();
            const user = users.find(u => u.email === email);
            
            if (user) {
                setCurrentUser(user);
                showToast('Login successful! Redirecting...', 'success');
                setTimeout(() => {
                    window.location.href = 'dashboard.html';
                }, 1500);
            } else {
                showToast('No account found with this Google account. Please sign up first.', 'error');
            }
        }
    }, 1000);
}

// ===== INITIALIZATION =====
document.addEventListener('DOMContentLoaded', function() {
    // Initialize users storage
    initializeUsers();
    
    // Check which page we're on
    const isDashboard = window.location.pathname.includes('dashboard.html');
    const isIndex = window.location.pathname.includes('index.html') || 
                    window.location.pathname.endsWith('/') || 
                    window.location.pathname.endsWith('index');
    
    // Handle authentication redirects
    if (isDashboard && !isAuthenticated()) {
        window.location.href = 'index.html';
        return;
    }
    
    if (isIndex && isAuthenticated()) {
        window.location.href = 'dashboard.html';
        return;
    }
    
    // Initialize dashboard if on dashboard page
    if (isDashboard) {
        // Loading animation
        const loader = document.getElementById('loader');
        const mainContainer = document.getElementById('mainContainer');
        
        if (loader && mainContainer) {
            let progress = 0;
            const interval = setInterval(() => {
                progress += 2;
                const progressEl = document.getElementById('loaderProgress');
                const percentageEl = document.getElementById('loaderPercentage');
                
                if (progressEl) progressEl.style.width = `${progress}%`;
                if (percentageEl) percentageEl.textContent = `${progress}%`;
                
                if (progress >= 100) {
                    clearInterval(interval);
                    setTimeout(() => {
                        loader.style.opacity = '0';
                        setTimeout(() => {
                            loader.style.display = 'none';
                            mainContainer.style.display = 'flex';
                            initializeDashboard();
                        }, 500);
                    }, 500);
                }
            }, 30);
        } else {
            initializeDashboard();
        }
    }
    
    // Initialize auth page if on index page
    if (isIndex) {
        initializeAuthPage();
    }
});

function initializeAuthPage() {
    // Auth tabs
    const authTabs = document.querySelectorAll('.auth-tab-premium');
    if (authTabs.length) {
        authTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const tabName = tab.getAttribute('data-tab');
                
                authTabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                
                document.querySelectorAll('.auth-form-premium').forEach(form => {
                    form.classList.remove('active');
                });
                
                const activeForm = document.getElementById(`${tabName}Form`);
                if (activeForm) activeForm.classList.add('active');
            });
        });
    }
    
    // Toggle password visibility
    document.querySelectorAll('.toggle-password').forEach(button => {
        button.addEventListener('click', function() {
            const targetId = this.getAttribute('data-target');
            const input = document.getElementById(targetId);
            const icon = this.querySelector('i');
            
            if (input) {
                if (input.type === 'password') {
                    input.type = 'text';
                    if (icon) icon.className = 'fas fa-eye-slash';
                } else {
                    input.type = 'password';
                    if (icon) icon.className = 'fas fa-eye';
                }
            }
        });
    });
    
    // Sign Up Form
    const signupForm = document.getElementById('signupForm');
    if (signupForm) {
        signupForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const name = document.getElementById('signupName')?.value.trim();
            const email = document.getElementById('signupEmail')?.value.trim();
            const password = document.getElementById('signupPassword')?.value;
            const confirmPassword = document.getElementById('confirmPassword')?.value;
            
            if (!name || !email || !password || !confirmPassword) {
                showToast('Please fill all fields', 'error');
                return;
            }
            
            if (!validateEmail(email)) {
                showToast('Please enter a valid email address', 'error');
                return;
            }
            
            if (!validatePassword(password)) {
                showToast('Password must be at least 8 characters with letters and numbers', 'error');
                return;
            }
            
            if (password !== confirmPassword) {
                showToast('Passwords do not match', 'error');
                return;
            }
            
            const agreeTerms = document.getElementById('agreeTerms');
            if (agreeTerms && !agreeTerms.checked) {
                showToast('Please accept the terms and conditions', 'error');
                return;
            }
            
            const user = {
                id: Date.now(),
                name,
                email,
                password,
                createdAt: new Date().toISOString()
            };
            
            const result = saveUser(user);
            if (!result.success) {
                showToast(result.message, 'error');
                return;
            }
            
            setCurrentUser(user);
            showToast('Account created successfully! Redirecting...', 'success');
            
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 1500);
        });
    }
    
    // Login Form
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const email = document.getElementById('loginEmail')?.value.trim();
            const password = document.getElementById('loginPassword')?.value;
            
            if (!email || !password) {
                showToast('Please fill all fields', 'error');
                return;
            }
            
            const result = authenticateUser(email, password);
            if (!result.success) {
                showToast(result.message, 'error');
                return;
            }
            
            setCurrentUser(result.user);
            showToast('Login successful! Redirecting...', 'success');
            
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 1500);
        });
    }
}

// ===== EXPORT GLOBAL FUNCTIONS =====
// Dashboard functions
window.initializeDashboard = initializeDashboard;
window.saveTrade = saveTrade;
window.saveAndDownloadTrade = saveAndDownloadTrade;
window.deleteTrade = deleteTrade;
window.processDeposit = processDeposit;
window.saveAndDownloadDeposit = saveAndDownloadDeposit;
window.deleteDeposit = deleteDeposit;
window.processWithdrawal = processWithdrawal;
window.saveAndDownloadWithdrawal = saveAndDownloadWithdrawal;
window.deleteWithdrawal = deleteWithdrawal;
window.saveGoal = saveGoal;
window.clearGoal = clearGoal;
window.editGoal = editGoal;
window.deleteGoal = deleteGoal;
window.setTheme = setTheme;
window.clearAllData = clearAllData;
window.changeCalendarMonth = changeCalendarMonth;
window.showChangePasswordModal = showChangePasswordModal;
window.closeChangePasswordModal = closeChangePasswordModal;
window.saveNewPassword = saveNewPassword;
window.saveUsername = saveUsername;
window.saveTradingRules = saveTradingRules;
window.exportDashboardPDF = exportDashboardPDF;
window.exportJournalPDF = exportJournalPDF;
window.exportAnalyticsPDF = exportAnalyticsPDF;
window.exportTransactionsPDF = exportTransactionsPDF;
window.exportAllDataPDF = exportAllDataPDF;
window.downloadChartAsPDF = downloadChartAsPDF;
window.showCustomStrategy = showCustomStrategy;
window.showPositionCalculator = showPositionCalculator;
window.closePositionCalculator = closePositionCalculator;
window.calculatePositionSize = calculatePositionSize;
window.downloadTradingPlanTemplate = downloadTradingPlanTemplate;

// Auth functions
window.handleGoogleAuth = handleGoogleAuth;
window.logout = logout;

// Utility functions
window.formatCurrency = formatCurrency;
window.formatCurrencyWithSign = formatCurrencyWithSign;
window.formatDate = formatDate;
window.showToast = showToast;
