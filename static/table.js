class Row {
    constructor(xmin, id, username, displayName) {
        this.ctid = null; // { pageNumber, rowNumber }
        this.xmin = xmin;
        this.xmin_status = 'invalid';
        this.xmax = null;
        this.xmax_status = null;
        this.id = id;
        this.username = username;
        this.displayName = displayName;
    }

    isLive() {
        return !this.isDead();
    }

    isDead() {
        if (this.xmin_status === 'aborted') {
            // Never inserted
            return true;
        }

        // Deleted before the oldest transaction
        return (this.xmax_status === 'committed' && this.xmax < oldestTxid());
    }

    isVisible(txid) {
        if (this.xmax === txid) {
            // Deleted by this transaction
            return false;
        }
        if (this.xmin === txid) {
            // Created by this transaction
            return true;
        }

        // Visible if committed xmin < txid < committed xmax (if any)
        if (this.xmin < txid && this.xmin_status === 'committed') {
            return this.xmax_status !== 'committed' || this.xmax > txid;
        }

        return false;
    }
}

const RowsPerPage = 4;

class Page {
    constructor(pageNumber) {
        this.pageNumber = pageNumber;
        this.rows = new Array(RowsPerPage).fill(null);
    }

    isEmpty() {
        return this.rows.every(row => row === null);
    }

    hasFreeSpace() {
        return this.rows.some(row => row === null);
    }

    insertRow(row) {
        const emptyIndex = this.rows.findIndex(r => r === null);
        row.ctid = { pageNumber: this.pageNumber, rowNumber: emptyIndex };
        this.rows[emptyIndex] = row;
    }

    vacuum() {
        this.rows.forEach((row, i) => {
            if (row && !row.isLive()) {
                this.rows[i] = null;
            }
        });
    }
}

class Table {
    constructor() {
        this.pages = [];
        this.nextId = 1;
    }

    insert(txid, username, displayName) {
        return this._insert(new Row(
            txid,
            this.nextId++,
            username,
            displayName,
        ));
    }

    _insert(row) {
        let page = this.pages.find(p => p.hasFreeSpace());
        if (!page) {
            page = new Page(this.pages.length);
            this.pages.push(page);
        }

        page.insertRow(row);
        return row;
    }

    update(txid, ctid, username = null, displayName = null) {
        const oldRow = this.delete(txid, ctid);
        if (!oldRow) {
            return null;
        }

        return this._insert(new Row(
            txid,
            oldRow.id,
            username ?? oldRow.username,
            displayName ?? oldRow.displayNamem
        ));
    }

    delete(txid, ctid) {
        const page = this.pages[ctid.pageNumber];
        const row = page.rows[ctid.rowNumber];
        if (!row || !row.isLive()) {
            return false;
        }

        row.xmax = txid;
        row.xmax_status = 'invalid';
        return row;
    }

    vacuum(indexes) {
        this.pages.forEach(page => page.rows.forEach((row, i) => {
            if (row && !row.isLive()) {
                indexes.forEach(index => index.delete(row));
                page.rows[i] = null;
            }
        }));

        while (this.pages.length > 0 && this.pages[this.pages.length - 1].isEmpty()) {
            this.pages.pop();
        }
    }

    vacuumFull(indexes) {
        const liveRows = [];

        this.pages.forEach(page => page.rows.forEach(row => {
            if (row && row.isLive()) {
                liveRows.push(row);
            }
        }));

        this.pages = [];
        indexes.forEach(index => index.clear());

        liveRows.forEach(row => {
            const newRow = this._insert(row);
            indexes.forEach(index => index.insert(newRow));
        });
    }
}
