// Variables globales
let filteredTransactions = [...transactions];
let currentPage = 1;
const rowsPerPage = 5;
let categoryChart = null;
let trendChart = null;
const budgetGoals = JSON.parse(localStorage.getItem('budgetGoals') || '[]');
const commonCategories = ['Alimentation', 'Transport', 'Logement', 'Factures', 'Divertissement', 'Shopping', 'Santé', 'Éducation', 'Salaire', 'Investissement', 'Cadeaux', 'Autres'];
let existingCategories = [...new Set([...commonCategories, ...categories.map(c => c.category)]).values()];

// Initialisation
document.addEventListener('DOMContentLoaded', function() {
    setDefaultDate();
    loadExistingCategories();
    initCategoryAutocomplete();
    createCategoryChart();
    createTrendChart();
    generateBudgetTips();
    renderBudgetGoals();
    setupEventListeners();
    updateMonthlySummary();
    
    // Initialisation des filtres
    filterTransactions();
});

// Fonctions utilitaires
function formatCurrency(amount) {
    return parseFloat(amount).toFixed(2) + ' MAD';
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR');
}

function setDefaultDate() {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('date').value = today;
}

// Gestion des filtres
function filterTransactions() {
    const periodFilter = document.getElementById('period-filter').value;
    const typeFilter = document.getElementById('type-filter').value;
    const categoryFilter = document.getElementById('category-filter').value;
    
    const today = new Date();
    const oneWeekAgo = new Date(today);
    oneWeekAgo.setDate(today.getDate() - 7);
    const oneMonthAgo = new Date(today);
    oneMonthAgo.setMonth(today.getMonth() - 1);
    
    filteredTransactions = transactions.filter(transaction => {
        const transactionDate = new Date(transaction.date);
        
        // Filtre de période
        if (periodFilter === 'today' && transactionDate.toDateString() !== today.toDateString()) {
            return false;
        }
        if (periodFilter === 'week' && transactionDate < oneWeekAgo) {
            return false;
        }
        if (periodFilter === 'month' && transactionDate < oneMonthAgo) {
            return false;
        }
        
        // Filtre de type
        if (typeFilter !== 'all' && transaction.type !== typeFilter) {
            return false;
        }
        
        // Filtre de catégorie
        if (categoryFilter !== 'all' && transaction.category !== categoryFilter) {
            return false;
        }
        
        return true;
    });
    
    currentPage = 1;
    renderTransactions();
    updatePagination();
}

// Rendu des transactions
function renderTransactions() {
    const tbody = document.getElementById('transactions-list');
    tbody.innerHTML = '';
    
    const start = (currentPage - 1) * rowsPerPage;
    const end = start + rowsPerPage;
    const paginatedTransactions = filteredTransactions.slice(start, end);
    
    paginatedTransactions.forEach(t => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><span class="transaction-type ${t.type === 'income' ? 'type-income' : 'type-expense'}">
                ${t.type === 'income' ? 'Revenu' : 'Dépense'}
            </span></td>
            <td><span class="category-tag">${t.category}</span></td>
            <td class="${t.type === 'income' ? 'income' : 'expense'}">
                ${formatCurrency(t.amount)}
            </td>
            <td>${formatDate(t.date)}</td>
            <td>${t.description || '-'}</td>
            <td>
                <a href="?delete=${t.id}" class="btn btn-danger" onclick="return confirm('Voulez-vous vraiment supprimer cette transaction?')">
                    <i class="fas fa-trash"></i>
                </a>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// Pagination
function updatePagination() {
    const pagination = document.getElementById('pagination');
    pagination.innerHTML = '';
    
    const pageCount = Math.ceil(filteredTransactions.length / rowsPerPage);
    
    for (let i = 1; i <= pageCount; i++) {
        const li = document.createElement('li');
        li.innerHTML = `<a href="#" class="${i === currentPage ? 'active' : ''}">${i}</a>`;
        li.querySelector('a').addEventListener('click', (e) => {
            e.preventDefault();
            currentPage = i;
            renderTransactions();
            updatePagination();
        });
        pagination.appendChild(li);
    }
}

// Autocomplétion des catégories
function loadExistingCategories() {
    const categoryFilter = document.getElementById('category-filter');
    categoryFilter.innerHTML = '<option value="all">Toutes</option>';
    existingCategories.forEach(category => {
        const option = document.createElement('option');
        option.value = category;
        option.textContent = category;
        categoryFilter.appendChild(option);
    });
}

function initCategoryAutocomplete() {
    const categoryInput = document.getElementById('category');
    const suggestions = document.getElementById('category-suggestions');
    
    categoryInput.addEventListener('input', () => {
        const value = categoryInput.value.toLowerCase();
        suggestions.innerHTML = '';
        
        if (value.length < 1) {
            suggestions.style.display = 'none';
            return;
        }
        
        const matches = existingCategories.filter(c => c.toLowerCase().includes(value));
        if (matches.length === 0) {
            suggestions.style.display = 'none';
            return;
        }
        
        matches.forEach(match => {
            const div = document.createElement('div');
            div.className = 'category-suggestion';
            div.textContent = match;
            div.addEventListener('click', () => {
                categoryInput.value = match;
                suggestions.style.display = 'none';
            });
            suggestions.appendChild(div);
        });
        
        suggestions.style.display = 'block';
    });
    
    categoryInput.addEventListener('blur', () => {
        setTimeout(() => {
            suggestions.style.display = 'none';
        }, 200);
    });
}

// Graphiques
function createCategoryChart() {
    const ctx = document.getElementById('categoryChart').getContext('2d');
    categoryChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: categories.map(c => c.category),
            datasets: [{
                data: categories.map(c => c.total),
                backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40']
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });
}

function createTrendChart() {
    fetch('?api=trends')
        .then(response => response.json())
        .then(trends => {
            const ctx = document.getElementById('trendChart').getContext('2d');
            trendChart = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: trends.map(t => t.month),
                    datasets: [
                        {
                            label: 'Revenus',
                            data: trends.map(t => t.income),
                            backgroundColor: 'rgba(46, 204, 113, 0.6)',
                            borderColor: 'rgba(46, 204, 113, 1)',
                            borderWidth: 1
                        },
                        {
                            label: 'Dépenses',
                            data: trends.map(t => t.expense),
                            backgroundColor: 'rgba(231, 76, 60, 0.6)',
                            borderColor: 'rgba(231, 76, 60, 1)',
                            borderWidth: 1
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            beginAtZero: true,
                            title: {
                                display: true,
                                text: 'Montant (MAD)'
                            }
                        },
                        x: {
                            title: {
                                display: true,
                                text: 'Mois'
                            }
                        }
                    }
                }
            });
        });
}

// Conseils budgétaires
function generateBudgetTips() {
    const tipsContainer = document.getElementById('tips-container');
    tipsContainer.innerHTML = '';
    
    const totalExpenses = categories.reduce((sum, c) => sum + parseFloat(c.total), 0);
    const avgExpense = totalExpenses / (categories.length || 1);
    
    categories.forEach(c => {
        if (parseFloat(c.total) > avgExpense * 1.5) {
            const reduction = (parseFloat(c.total) - avgExpense).toFixed(2);
            const tip = document.createElement('div');
            tip.className = 'tip-item';
            tip.innerHTML = `
                <i class="fas fa-exclamation-circle tip-icon"></i>
                Réduisez les dépenses en ${c.category} de ${formatCurrency(reduction)} pour équilibrer votre budget.
            `;
            tipsContainer.appendChild(tip);
        }
    });
    
    if (!tipsContainer.innerHTML) {
        const tip = document.createElement('div');
        tip.className = 'tip-item';
        tip.innerHTML = `
            <i class="fas fa-check-circle tip-icon"></i>
            Vos dépenses sont équilibrées !
        `;
        tipsContainer.appendChild(tip);
    }
}

// Objectifs budgétaires
function renderBudgetGoals() {
    const goalsContainer = document.getElementById('budget-goals-container');
    goalsContainer.innerHTML = '';
    
    budgetGoals.forEach((goal, index) => {
        const currentSpent = categories.find(c => c.category === goal.category)?.total || 0;
        const progress = Math.min((currentSpent / goal.amount) * 100, 100);
        const isOver = currentSpent > goal.amount;
        
        const goalDiv = document.createElement('div');
        goalDiv.className = 'budget-goal-container';
        goalDiv.innerHTML = `
            <span>${goal.category}: ${formatCurrency(goal.amount)}</span>
            <div class="budget-indicator">
                <div class="budget-progress ${isOver ? 'budget-over' : ''}" style="width: ${progress}%"></div>
            </div>
            <button class="btn btn-danger" onclick="deleteGoal(${index})">
                <i class="fas fa-trash"></i>
            </button>
        `;
        goalsContainer.appendChild(goalDiv);
    });
}

function addBudgetGoal(category, amount) {
    budgetGoals.push({ category, amount: parseFloat(amount) });
    localStorage.setItem('budgetGoals', JSON.stringify(budgetGoals));
    renderBudgetGoals();
}

function deleteGoal(index) {
    budgetGoals.splice(index, 1);
    localStorage.setItem('budgetGoals', JSON.stringify(budgetGoals));
    renderBudgetGoals();
}

// Résumé mensuel
function updateMonthlySummary() {
    const currentMonth = new Date().toISOString().slice(0, 7);
    const monthlyTransactions = transactions.filter(t => t.date.startsWith(currentMonth));
    
    const monthlyIncome = monthlyTransactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + parseFloat(t.amount), 0);
    
    const monthlyExpense = monthlyTransactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + parseFloat(t.amount), 0);
    
    const summary = document.getElementById('monthly-summary');
    summary.innerHTML = `
        <div class="stat-card">
            <h3>Revenus ce mois</h3>
            <div class="stat-value income">${formatCurrency(monthlyIncome)}</div>
        </div>
        <div class="stat-card">
            <h3>Dépenses ce mois</h3>
            <div class="stat-value expense">${formatCurrency(monthlyExpense)}</div>
        </div>
        <div class="stat-card">
            <h3>Épargne ce mois</h3>
            <div class="stat-value ${monthlyIncome - monthlyExpense >= 0 ? 'balance-positive' : 'balance-negative'}">
                ${formatCurrency(monthlyIncome - monthlyExpense)}
            </div>
        </div>
    `;
}

// Gestion des événements
function setupEventListeners() {
    // Toggle formulaire
    document.getElementById('toggle-form-btn').addEventListener('click', () => {
        const formContainer = document.getElementById('transaction-form-container');
        const icon = document.getElementById('toggle-form-btn').querySelector('i');
        formContainer.classList.toggle('hidden');
        icon.classList.toggle('fa-chevron-down');
        icon.classList.toggle('fa-chevron-up');
    });
    
    // Filtres
    document.getElementById('period-filter').addEventListener('change', filterTransactions);
    document.getElementById('type-filter').addEventListener('change', filterTransactions);
    document.getElementById('category-filter').addEventListener('change', filterTransactions);
    
    // Optimisation du budget
    document.getElementById('optimize-budget-btn').addEventListener('click', generateBudgetTips);
    
    // Ajouter un objectif
    document.getElementById('add-goal-btn').addEventListener('click', () => {
        const category = prompt('Entrez la catégorie de l\'objectif :');
        if (!category) return;
        
        const amount = prompt('Entrez le montant maximum (MAD) :');
        if (!amount || isNaN(amount) || amount <= 0) {
            alert('Veuillez entrer un montant valide.');
            return;
        }
        
        addBudgetGoal(category, amount);
    });
}
