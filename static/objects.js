const table = new Table();
const indexAndNames = [
    {index: new BTree('id'), name:'index-id'}, 
    {index: new BTree('username'), name:'index-username'},
];

const indexes = indexAndNames.map(indexName => indexName.index);

function insertRow(username, displayName, txid) {
    const row = table.insert(txid, username, displayName);
    indexes.forEach(index => index.insert(row));
}

function updateRow(row, username, displayName, txid) {
    const updatedRow = table.update(txid, row.ctid, username, displayName);
    indexes.forEach(index => index.insert(updatedRow));
}

function deleteRow(row, txid) {
    table.delete(txid, row.ctid);
}

function vacuum() {
    table.vacuum(indexes);
}

function vacuumFull() {
    table.vacuumFull(indexes);
}
