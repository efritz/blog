function render() {
    renderTable(table);
    indexAndNames.forEach(({ index, name }) => renderBTree(index, name));
    renderTransactionControls();
    renderInsertFormButton();
}

const columns = [
    'ctid',
    'xmin',
    'xmax',
    'id',
    'username',
    'display name',
];

function renderTable(table) {
    function renderPage($tableDiv, page) {
        const $tbl = $('<table>');
        const $header = $('<tr>');
        columns.forEach(text => $('<th>', { text: text }).appendTo($header));
        $('<th>', { text: '' }).appendTo($header);
        $tbl.append($header);
    
        page.rows.forEach(row => {
            const $tr = $('<tr>');
            renderRow($tr, row);
            $tbl.append($tr);
        });
    
        const $pageTitle = $('<div>', { class: 'page-title', text: `Page ${page.pageNumber}` });
        $tableDiv.append($pageTitle);
        $tableDiv.append($tbl);
    }

    function renderRow($tr, row) {
        if (row === null) {
            for (let j = 0; j < columns.length + 1; j++) {
                $('<td>').appendTo($tr);
            }
            
            $tr.css('background-color', '#eaeaea');
            return $tr;
        }

        const isLive = row.isLive();
        const isLocked = row.xmax !== null && row.xmax_status === 'invalid';
        const isVisible = selectedTxid === null || row.isVisible(selectedTxid);
    
        const $ctidCell = $('<td>');
        $ctidCell.append(`(${row.ctid.pageNumber}, ${row.ctid.rowNumber})`);
        if (isLocked) {
            $ctidCell.append(' ', $('<i>', { class: 'fas fa-lock', title: 'Pending xmax' }));
        }
        $ctidCell.appendTo($tr);
    
        $('<td>').append(
            $('<span>', { text: row.xmin + ' ' }),
            getStatusIcon(row.xmin_status)
        ).appendTo($tr);
    
        $('<td>').append(
            $('<span>', { text: row.xmax !== null ? row.xmax + ' ' : '' }),
            row.xmax !== null ? getStatusIcon(row.xmax_status) : ''
        ).appendTo($tr);
    
        $('<td>', { text: row.id }).appendTo($tr);
        $('<td>', { text: row.username }).appendTo($tr);
        $('<td>', { text: row.displayName }).appendTo($tr);
    
        const $actionTd = $('<td>');
        if (isLive) {
            const $actionButtons = $('<div>', { class: 'action-buttons' });
            $actionButtons.append(createEditButton(() => showEditForm($tr, row), !isLocked && selectedTxid !== null));
            $actionButtons.append(createDeleteButton(() => handleDeleteRow(row), !isLocked && selectedTxid !== null));
            $actionTd.append($actionButtons);
        }
        $tr.append($actionTd);
    
        if (!isVisible) {
            $tr.css('color', 'grey');
        }
        if (!isLive) {
            $tr.css('background-color', '#f9d6d5');
        }
        if (!isVisible) {
            $tr.find('button').prop('disabled', true);
        }
    }

    function showEditForm($tr, row) {
        const username = row.username;
        const displayName = row.displayName;

        const reset = () => {
            $tr.find('td:eq(4)').text(username);
            $tr.find('td:eq(5)').text(displayName);

            const $actionButtons = $('<div>', { class: 'action-buttons' });
            $actionButtons.append(createEditButton(() => showEditForm($tr, row)));
            $actionButtons.append(createDeleteButton(() => handleDeleteRow(row)));
            $tr.find('td:eq(6)').empty().append($actionButtons);
        }

        const $usernameInput = $('<input>', { type: 'text', value: username })
        $tr.find('td:eq(4)').empty().append($usernameInput);

        const $displayNameInput = $('<input>', { type: 'text', value: displayName })
        $tr.find('td:eq(5)').empty().append($displayNameInput);

        const $actionButtons = $('<div>', { class: 'action-buttons' });
        $actionButtons.append(createSaveButton(() => handleUpdateRow(row, $usernameInput.val(), $displayNameInput.val())));
        $actionButtons.append(createCancelButton(() => reset()));
        $actionButtons.append(createDeleteButton(() => handleDeleteRow(row)));

        const $actionTd = $tr.find('td:eq(6)');
        $actionTd.empty();
        $actionTd.append($actionButtons);
    }

    function getStatusIcon(status) {
        switch (status) {
            case 'committed':
                return $('<i>', { class: 'fas fa-check', title: 'Committed' });
            case 'invalid':
                return $('<i>', { class: 'fas fa-spinner fa-spin', title: 'Invalid' });
            case 'aborted':
                return $('<i>', { class: 'fas fa-times', title: 'Aborted' });
            default:
                return '';
        }
    }
    
    const $tableDiv = $('#table').empty();
    table.pages.forEach(page => renderPage($tableDiv, page));
}

function renderBTree(btree, containerId) {
    function renderNode(node) {
        const numItems = node.keys.length * 2 + 1;
        const $nodeDiv = $('<div>', { class: 'node' });
        const $nodeGrid = $('<div>', { class: 'node-grid ' + 'grid-' + numItems });

        $nodeGrid.css({ display: 'grid', gridTemplateColumns: `repeat(${numItems}, auto)` });

        // First row: child slots and keys
        for (let i = 0; i < numItems; i++) {
            if (i % 2 === 0) {
                if (!node.isLeaf) {
                    const prevValue = node.keys[i / 2 - 1];
                    const nextValue = node.keys[i / 2 + 0];

                    let range = 'n'
                    if (prevValue !== undefined) {
                        range = ('' + prevValue.key).replace(/\s+/g, '&nbsp;') + '&nbsp;≤&nbsp;' + range;
                    }
                    if (nextValue !== undefined) {
                        range = range + '&nbsp;<&nbsp;' + ('' + nextValue.key).replace(/\s+/g, '&nbsp;');
                    }

                    // Child slot
                    $('<div>', { class: 'child-slot' }).append(range).appendTo($nodeGrid);
                } else {
                    // If leaf, add an empty placeholder to maintain grid structure
                    $('<div>').appendTo($nodeGrid);
                }
            } else {
                // Key
                const keyIndex = (i - 1) / 2;
                const k = node.keys[keyIndex];

                // Create separate spans for the value and the ctid to distinguish them
                const $keyDiv = $('<div>', { class: 'node-key' });

                // Value
                $('<div>', { html: ('' + k.key).replace(/\s+/g, '&nbsp;') }).appendTo($keyDiv);

                // CTID with non-breaking space before it
                const html = `ctid:&nbsp;(${k.ctid.pageNumber},&nbsp;${k.ctid.rowNumber})`;
                $('<div>', { html, css: { fontSize: '10px' } }).appendTo($keyDiv);

                $keyDiv.appendTo($nodeGrid);
            }
        }

        // Second row: child nodes (if any)
        if (!node.isLeaf) {
            for (let i = 0; i < numItems; i++) {
                const $gridCell = $('<div>').css({ gridColumn: `${i + 1}`, gridRow: '2' });

                if (i % 2 === 0 && node.children[i / 2]) {
                    const $childNodeDiv = renderNode(node.children[i / 2]);
                    $gridCell.append($childNodeDiv);
                }

                $nodeGrid.append($gridCell);
            }
        }

        $nodeDiv.append($nodeGrid);
        return $nodeDiv;
    }

    const $container = $(`#${containerId}`).empty();

    if (!btree.root.isLeaf || btree.root.keys.length > 0) {
        const $treeDiv = renderNode(btree.root);
        $container.append($treeDiv);
    }
}


function renderTransactionControls() {
    const $select = $('#transaction-select');
    $select.empty();
    $select.append($('<option>', { value: '', text: 'Select Transaction' }));
    transactions.forEach(txid => $select.append($('<option>', { value: txid, text: `Transaction ${txid}` })));
    $select.val(selectedTxid);

    const isTransactionSelected = selectedTxid !== null;
    $('#toggle-insert-form').prop('disabled', !isTransactionSelected);
    $('#commit').prop('disabled', !isTransactionSelected);
    $('#rollback').prop('disabled', !isTransactionSelected);
    
    if (!isTransactionSelected) {
        insertFormShownFor = null;
    }
}

let insertFormShownFor = null;

function renderInsertFormButton() {
    const $form = $('#row-insert-form');
    const $button = $('#toggle-insert-form');
    
    if (insertFormShownFor === null || selectedTxid !== insertFormShownFor) {
        insertFormShownFor = null;
        $form.hide();
        $button.text('Insert User');
    } else {
        $form.show();
        $button.text('Cancel');
    }
}

function createEditButton(onClick, enabled) {
    return createButton('pencil-alt', 'edit-btn', onClick, enabled);
}

function createDeleteButton(onClick, enabled) {
    return createButton('trash-alt', 'delete-btn', onClick, enabled);
}

function createSaveButton(onClick) {
    return createButton('save', 'save-btn', onClick);
}

function createCancelButton(onClick) {
    return createButton('times', 'cancel-btn', onClick);
}

function createButton(icon, className, onClick, enabled = true) {
    return $('<button>', {
        html: `<i class="fas fa-${icon}"></i>`,
        click: onClick,
        disabled: !enabled
    }).addClass(className);
}
