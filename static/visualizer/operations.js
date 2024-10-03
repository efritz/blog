$(document).ready(function() {
    $('#new-transaction').on('click', handleNewTransaction);
    $('#transaction-select').on('change', handleTransactionSelect);
    $('#toggle-insert-form').on('click', handleShowInsertForm);
    $('#row-insert-form').on('submit', handleInsertRow);
    $('#vacuum').on('click', handleVacuum);
    $('#vacuum-full').on('click', handleVacuumFull);
    $('#commit').on('click', handleCommit);
    $('#rollback').on('click', handleRollback);

    loadInitialData();
});

const initialNames = [
    'Bob',
    'Eve',
    'David',
    'Alice',
    'Charlie',
];

function loadInitialData() {
    selectTxid(newTransaction());
    initialNames.forEach(name => insertRow(name.toLowerCase(), name, selectedTxid));
    commit();
    render();
}

function handleNewTransaction() {
    selectTxid(newTransaction());
    render();
}

function handleTransactionSelect() {
    selectTxid(parseInt($('#transaction-select').val()) || null);
    render();
}

function handleCommit() {
    if (!selectedTxid) {
        throw new Error('No transaction selected');
    }

    commit();
    render();
}

function handleRollback() {
    if (!selectedTxid) {
        throw new Error('No transaction selected');
    }

    rollback();
    render();
}

function handleVacuum() {
    vacuum();
    render();
}

function handleVacuumFull() {
    vacuumFull();
    render();
}

function handleShowInsertForm() {
    if (!selectedTxid) {
        throw new Error('No transaction selected');
    }

    insertFormShownFor = selectedTxid;
    render();
}

function handleInsertRow(event) {
    if (!selectedTxid) {
        throw new Error('No transaction selected');
    }

    const username = $('#username-input').val();
    $('#username-input').val('');

    const displayName = $('#display-name-input').val();
    $('#display-name-input').val('');

    event.preventDefault();
    insertRow(username, displayName, selectedTxid);
    insertFormShownFor = null;
    render();
}

function handleUpdateRow(row, username, displayName) {
    if (!selectedTxid) {
        throw new Error('No transaction selected');
    }

    updateRow(row, username, displayName, selectedTxid);
    render();
}

function handleDeleteRow(row) {
    if (!selectedTxid) {
        throw new Error('No transaction selected');
    }

    deleteRow(row, selectedTxid);
    render();
}
