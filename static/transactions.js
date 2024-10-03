let nextTxid = 1;
let transactions = [];
let selectedTxid = null;

function newTransaction() {
    const txid = nextTxid++;
    transactions.push(txid);
    return txid;
}

function selectTxid(txid) {
    selectedTxid = txid;
}

function oldestTxid() {
    return transactions.length > 0 ? Math.min(...transactions) : nextTxid;
}

function commit() {
    if (!selectedTxid) {
        throw new Error('No transaction selected');
    }

    updateTransactionStatus(selectedTxid, 'committed');
    transactions = transactions.filter(txid => txid !== selectedTxid);
    selectTxid(null);
}

function rollback() {
    if (!selectedTxid) {
        throw new Error('No transaction selected');
    }

    updateTransactionStatus(selectedTxid, 'aborted');
    transactions = transactions.filter(txid => txid !== selectedTxid);
    selectTxid(null);
}

function updateTransactionStatus(txid, newStatus) {
    table.pages.forEach(page => page.rows.forEach(row => {
        if (row && row.xmin === txid && row.xmin_status === 'invalid') {
            row.xmin_status = newStatus;
        }

        if (row && row.xmax === txid && row.xmax_status === 'invalid') {
            row.xmax_status = newStatus;
        }
    }));
}
