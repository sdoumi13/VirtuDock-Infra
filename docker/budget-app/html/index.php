<?php
// Compteur de requêtes HTTP
session_start();
if (!isset($_SESSION['http_requests_total'])) {
    $_SESSION['http_requests_total'] = 0;
}
$_SESSION['http_requests_total']++;

// Connexion à la base de données
$db = new PDO('sqlite:/var/www/html/budget.db');

// Création de la table si elle n'existe pas
$db->exec("CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY,
    type TEXT,
    category TEXT,
    amount REAL,
    date TEXT,
    description TEXT DEFAULT '',
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
)");

// Traitement des requêtes API si nécessaire
if (isset($_GET['api'])) {
    header('Content-Type: application/json');

    // API pour obtenir les données des transactions
    if ($_GET['api'] === 'transactions') {
        $stmt = $db->query("SELECT * FROM transactions ORDER BY date DESC");
        $transactions = $stmt->fetchAll(PDO::FETCH_ASSOC);
        echo json_encode($transactions);
        exit;
    }

    // API pour les catégories
    if ($_GET['api'] === 'categories') {
        $stmt = $db->query("SELECT category, SUM(amount) as total FROM transactions WHERE type='expense' GROUP BY category");
        $categories = $stmt->fetchAll(PDO::FETCH_ASSOC);
        echo json_encode($categories);
        exit;
    }

    // API pour les statistiques
    if ($_GET['api'] === 'stats') {
        $balance = $db->query("SELECT SUM(CASE WHEN type='income' THEN amount ELSE -amount END) FROM transactions")->fetchColumn() ?? 0;
        $income = $db->query("SELECT SUM(amount) FROM transactions WHERE type='income'")->fetchColumn() ?? 0;
        $expense = $db->query("SELECT SUM(amount) FROM transactions WHERE type='expense'")->fetchColumn() ?? 0;
        $count = $db->query("SELECT COUNT(*) FROM transactions")->fetchColumn();

        echo json_encode([
            'balance' => $balance,
            'income' => $income,
            'expense' => $expense,
            'count' => $count
        ]);
        exit;
    }

    // API pour les tendances mensuelles
    if ($_GET['api'] === 'trends') {
        $stmt = $db->query("SELECT
            strftime('%Y-%m', date) as month,
            SUM(CASE WHEN type='income' THEN amount ELSE 0 END) as income,
            SUM(CASE WHEN type='expense' THEN amount ELSE 0 END) as expense
            FROM transactions
            GROUP BY strftime('%Y-%m', date)
            ORDER BY month
        ");
        $trends = $stmt->fetchAll(PDO::FETCH_ASSOC);
        echo json_encode($trends);
        exit;
    }

    // Export CSV
    if ($_GET['api'] === 'export') {
        $stmt = $db->query("SELECT * FROM transactions ORDER BY date DESC");
        $transactions = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $filename = "budget_export_" . date("Y-m-d") . ".csv";

        header('Content-Type: text/csv');
        header('Content-Disposition: attachment; filename="' . $filename . '"');

        $output = fopen('php://output', 'w');

        // En-tête CSV
        fputcsv($output, ['ID', 'Type', 'Catégorie', 'Montant', 'Date', 'Description', 'Horodatage']);

        // Données
        foreach ($transactions as $row) {
            fputcsv($output, $row);
        }

        fclose($output);
        exit;
    }
}

// Traitement du formulaire d'ajout de transaction
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // Vérification des données soumises
    if (isset($_POST['type'], $_POST['category'], $_POST['amount'], $_POST['date'])) {
        $type = $_POST['type'];
        $category = $_POST['category'];
        $amount = floatval($_POST['amount']);
        $date = $_POST['date'];
        $description = isset($_POST['description']) ? $_POST['description'] : '';

        // Insertion de la transaction
        $stmt = $db->prepare("INSERT INTO transactions (type, category, amount, date, description) VALUES (?, ?, ?, ?, ?)");
        $stmt->execute([$type, $category, $amount, $date, $description]);

        // Redirection pour éviter les soumissions multiples
        header("Location: /");
        exit;
    }
}

// Suppression d'une transaction
if (isset($_GET['delete']) && is_numeric($_GET['delete'])) {
    $id = intval($_GET['delete']);
    $stmt = $db->prepare("DELETE FROM transactions WHERE id = ?");
    $stmt->execute([$id]);

    header("Location: /");
    exit;
}

// Récupération des données pour la page
$transactions = $db->query("SELECT * FROM transactions ORDER BY date DESC LIMIT 10")->fetchAll(PDO::FETCH_ASSOC);
$categories = $db->query("SELECT category, SUM(amount) as total FROM transactions WHERE type='expense' GROUP BY category")->fetchAll(PDO::FETCH_ASSOC);
$balance = $db->query("SELECT SUM(CASE WHEN type='income' THEN amount ELSE -amount END) FROM transactions")->fetchColumn() ?? 0;
$income = $db->query("SELECT SUM(amount) FROM transactions WHERE type='income'")->fetchColumn() ?? 0;
$expense = $db->query("SELECT SUM(amount) FROM transactions WHERE type='expense'")->fetchColumn() ?? 0;
$transaction_count = $db->query("SELECT COUNT(*) FROM transactions")->fetchColumn();

// Point de terminaison pour Prometheus/Grafana
if ($_SERVER['REQUEST_URI'] === '/metrics') {
    header('Content-Type: text/plain');
    echo "# HELP http_requests_total Total number of HTTP requests\n";
    echo "# TYPE http_requests_total counter\n";
    echo "http_requests_total{method=\"GET\",status=\"200\"} " . $_SESSION['http_requests_total'] . "\n";
    echo "# HELP transactions_total Total number of transactions\n";
    echo "# TYPE transactions_total counter\n";
    echo "transactions_total $transaction_count\n";
    echo "# HELP budget_balance Current budget balance\n";
    echo "# TYPE budget_balance gauge\n";
    echo "budget_balance $balance\n";
    echo "# HELP budget_income Total income\n";
    echo "# TYPE budget_income counter\n";
    echo "budget_income $income\n";
    echo "# HELP budget_expense Total expense\n";
    echo "# TYPE budget_expense counter\n";
    echo "budget_expense $expense\n";
    exit;
}
?>

<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Gestionnaire de Budget Personnel</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <link rel="stylesheet" href="style.css">
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
</head>
<body>
    <header>
        <h1><i class="fas fa-wallet"></i> Gestionnaire de Budget Personnel</h1>
    </header>

    <div class="container">
        <div class="stats-container">
            <div class="stat-card">
                <h3>SOLDE</h3>
                <div class="stat-value <?= $balance >= 0 ? 'balance-positive' : 'balance-negative' ?>" id="balance-value"><?= number_format($balance, 2) ?> MAD</div>
            </div>
            <div class="stat-card">
                <h3>REVENUS TOTAUX</h3>
                <div class="stat-value income" id="income-value"><?= number_format($income, 2) ?> MAD</div>
            </div>
            <div class="stat-card">
                <h3>DÉPENSES TOTALES</h3>
                <div class="stat-value expense" id="expense-value"><?= number_format($expense, 2) ?> MAD</div>
            </div>
            <div class="stat-card">
                <h3>TRANSACTIONS</h3>
                <div class="stat-value" id="transaction-count"><?= $transaction_count ?></div>
            </div>
        </div>

        <div class="dashboard">
            <div class="main-content">
                <div class="card">
                    <div class="card-header">
                        <h2>Ajouter une Transaction</h2>
                        <button class="toggle-panel" id="toggle-form-btn">
                            <i class="fas fa-chevron-down"></i> Afficher/Masquer
                        </button>
                    </div>
                    <div id="transaction-form-container">
                        <form method="POST" id="transaction-form">
                            <div class="form-grid">
                                <div class="form-group">
                                    <label for="type">Type:</label>
                                    <select name="type" id="type" required>
                                        <option value="income">Revenu</option>
                                        <option value="expense">Dépense</option>
                                    </select>
                                </div>
                                <div class="form-group category-select-container">
                                    <label for="category">Catégorie:</label>
                                    <input type="text" name="category" id="category" autocomplete="off" required>
                                    <div class="category-suggestions" id="category-suggestions"></div>
                                </div>
                                <div class="form-group">
                                    <label for="amount">Montant (MAD):</label>
                                    <input type="number" name="amount" id="amount" step="0.01" min="0.01" required>
                                </div>
                                <div class="form-group">
                                    <label for="date">Date:</label>
                                    <input type="date" name="date" id="date" required>
                                </div>
                                <div class="form-group">
                                    <label for="description">Description:</label>
                                    <input type="text" name="description" id="description" placeholder="Optionnel">
                                </div>
                            </div>
                            <button type="submit" class="btn btn-success">
                                <i class="fas fa-plus-circle"></i> Ajouter la Transaction
                            </button>
                        </form>
                    </div>
                </div>

                <div class="card">
                    <div class="card-header">
                        <h2>Transactions Récentes</h2>
                        <div class="filters">
                            <div class="filter-item">
                                <span class="filter-label">Période:</span>
                                <select id="period-filter">
                                    <option value="all">Toutes</option>
                                    <option value="today">Aujourd'hui</option>
                                    <option value="week">Cette semaine</option>
                                    <option value="month" selected>Ce mois</option>
                                </select>
                            </div>
                            <div class="filter-item">
                                <span class="filter-label">Type:</span>
                                <select id="type-filter">
                                    <option value="all">Tous</option>
                                    <option value="income">Revenus</option>
                                    <option value="expense">Dépenses</option>
                                </select>
                            </div>
                            <div class="filter-item">
                                <span class="filter-label">Catégorie:</span>
                                <select id="category-filter">
                                    <option value="all">Toutes</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <div class="table-responsive">
                        <table id="transactions-table">
                            <thead>
                                <tr>
                                    <th>Type</th>
                                    <th>Catégorie</th>
                                    <th>Montant (MAD)</th>
                                    <th>Date</th>
                                    <th>Description</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody id="transactions-list">
                                <?php foreach ($transactions as $t): ?>
                                <tr>
                                    <td>
                                        <span class="transaction-type <?= $t['type'] === 'income' ? 'type-income' : 'type-expense' ?>">
                                            <?= $t['type'] === 'income' ? 'Revenu' : 'Dépense' ?>
                                        </span>
                                    </td>
                                    <td><span class="category-tag"><?= htmlspecialchars($t['category']) ?></span></td>
                                    <td class="<?= $t['type'] === 'income' ? 'income' : 'expense' ?>">
                                        <?= number_format($t['amount'], 2) ?> MAD
                                    </td>
                                    <td><?= htmlspecialchars($t['date']) ?></td>
                                    <td><?= htmlspecialchars($t['description'] ?? '-') ?></td>
                                    <td>
                                        <a href="?delete=<?= $t['id'] ?>" class="btn btn-danger" onclick="return confirm('Voulez-vous vraiment supprimer cette transaction?')">
                                            <i class="fas fa-trash"></i>
                                        </a>
                                    </td>
                                </tr>
                                <?php endforeach; ?>
                            </tbody>
                        </table>
                    </div>

                    <div id="pagination" class="pagination"></div>

                    <div class="export-options">
                        <a href="?api=export" class="export-btn">
                            <i class="fas fa-file-csv"></i> Exporter en CSV
                        </a>
                    </div>
                </div>
            </div>

            <div class="sidebar">
                <div class="card">
                    <div class="card-header">
                        <h2>Dépenses par Catégorie</h2>
                    </div>
                    <div class="chart-container">
                        <canvas id="categoryChart"></canvas>
                    </div>
                </div>

                <div class="card">
                    <div class="card-header">
                        <h2>Tendances Mensuelles</h2>
                    </div>
                    <div class="chart-container">
                        <canvas id="trendChart"></canvas>
                    </div>
                </div>

                <div class="card">
                    <div class="card-header">
                        <h2>Conseils Budgétaires</h2>
                    </div>
                    <div class="tips-container" id="tips-container"></div>
                    <button class="btn btn-warning" id="optimize-budget-btn">
                        <i class="fas fa-magic"></i> Optimiser mon Budget
                    </button>
                </div>

                <div class="card">
                    <div class="card-header">
                        <h2>Objectifs Budgétaires</h2>
                        <button class="btn" id="add-goal-btn">
                            <i class="fas fa-plus"></i> Ajouter
                        </button>
                    </div>
                    <div id="budget-goals-container"></div>
                </div>
            </div>
        </div>

        <div class="summary-section">
            <h3>Résumé Mensuel</h3>
            <div id="monthly-summary"></div>
        </div>

        <div class="monitoring-section">
            <button class="btn" onclick="window.open('http://192.168.48.34:3000', '_blank')">
                <i class="fas fa-chart-line"></i> Accéder au Monitoring
            </button>
        </div>
    </div>

    <script>
        // Données PHP injectées dans JavaScript
        const categories = <?php echo json_encode($categories); ?>;
        const transactions = <?php echo json_encode($transactions); ?>;
        const balanceValue = <?php echo $balance; ?>;
        const incomeValue = <?php echo $income; ?>;
        const expenseValue = <?php echo $expense; ?>;
        const transactionCount = <?php echo $transaction_count; ?>;
    </script>
    <script src="budget.js"></script>
</body>
</html>
