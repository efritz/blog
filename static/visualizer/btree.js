const MinDegree = 2;
const MaxDegree = 2 * MinDegree;
const NumMaxKeys = MaxDegree - 1;

class BTreeNode {
    constructor(isLeaf = true) {
        this.keys = []; // { key, ctid }[]
        this.children = [];
        this.isLeaf = isLeaf;
    }

    //
    // Insertion

    insert(key, ctid) {
        if (this.isFull()) {
            throw new Error('Assertion failed: node is full')
        }

        if (this.isLeaf) {
            this.insertIntoLeafNode(key, ctid)
        } else {
            this.insertIntoInternalNode(key, ctid)
        }
    }

    insertIntoLeafNode(key, ctid) {
        if (!this.isLeaf) {
            throw new Error('Assertion failed: node is not leaf')
        }
        if (this.isFull()) {
            throw new Error('Assertion failed: node is full')
        }

        let keyIndex = this.keys.length - 1;
        while (keyIndex >= 0 && key < this.keys[keyIndex].key) {
            keyIndex--;
        }

        this.keys.splice(keyIndex + 1, 0, { key, ctid });
    }

    insertIntoInternalNode(key, ctid) {
        if (this.isLeaf) {
            throw new Error('Assertion failed: node is leaf')
        }
        if (this.isFull()) {
            throw new Error('Assertion failed: node is full')
        }

        let childIndex = this.keys.length - 1;
        while (childIndex >= 0 && key < this.keys[childIndex].key) {
            childIndex--;
        }
        childIndex++;

        // Full children can't take more nodes; split it
        if (this.children[childIndex].isFull()) {
            this.splitChild(childIndex);

            // Determine which of the split children to insert into
            if (key > this.keys[childIndex].key) {
                childIndex++;
            }
        }

        this.children[childIndex].insert(key, ctid);
    }

    //
    // Deletion

    deleteKey(key, ctid) {
        if (this.isLeaf) {
            this.deleteKeyFromLeafNode(key, ctid);
        } else {
            this.deleteKeyFromInternalNode(key, ctid);
        }
    }

    deleteKeyFromLeafNode(key, ctid) {
        if (!this.isLeaf) {
            throw new Error('Assertion failed: node is not leaf')
        }

        const keyIndex = this.findKey(key, ctid);
        if (keyIndex !== -1) {
            this.keys.splice(keyIndex, 1);
        }
    }

    deleteKeyFromInternalNode(key, ctid) {
        if (this.isLeaf) {
            throw new Error('Assertion failed: node is leaf')
        }

        const keyIndex = this.findKey(key, ctid);
        if (keyIndex !== -1) {
            this.deleteKeyFromInternalNodeWithKey(keyIndex);
        } else {
            this.deleteKeyFromInternalNodeWithoutKey(key, ctid);
        }
    }

    deleteKeyFromInternalNodeWithKey(keyIndex) {
        if (this.isLeaf) {
            throw new Error('Assertion failed: node is leaf')
        }

        // Attempt to replace value with predecessor key
        if (this.children[keyIndex].keys.length >= MinDegree) {
            const pred = this.getPredecessorKey(keyIndex);
            this.keys[keyIndex] = pred;

            // Delete duplicates
            this.children[keyIndex].deleteKey(pred.key, pred.ctid);
            return;
        }

        // Attempt to replace value with successor key
        if (this.children[keyIndex + 1].keys.length >= MinDegree) {
            const succ = this.getSuccessorKey(keyIndex);
            this.keys[keyIndex] = succ;

            // Delete duplicates
            this.children[keyIndex + 1].deleteKey(succ.key, succ.ctid);
            return;
        }

        // Not enough elements to borrow from either sibling
        // Merge siblings and delete the key from merged node
        const keyObj = this.keys[keyIndex];
        this.mergeChildren(keyIndex);
        this.children[keyIndex].deleteKey(keyObj.key, keyObj.ctid);
    }

    deleteKeyFromInternalNodeWithoutKey(key, ctid) {
        if (this.isLeaf) {
            throw new Error('Assertion failed: node is leaf')
        }

        let childIndex = this.findChildIndex(key);

        if (this.children[childIndex].keys.length < MinDegree) {
            this.fill(childIndex);

            // Adjust index if the last child was merged
            if (childIndex >= this.children.length) {
                childIndex--;
            }
        }

        this.children[childIndex].deleteKey(key, ctid);
    }

    fill(childIndex) {
        if (this.isLeaf) {
            throw new Error('Assertion failed: node is leaf')
        }

        // Attempt to borrow from left sibling
        if (childIndex !== 0 && this.children[childIndex - 1].keys.length >= MinDegree) {
            const left = this.children[childIndex - 1];
            const right = this.children[childIndex];

            // Move key splitting siblings down to the right
            right.keys.unshift(this.keys[childIndex - 1]);

            // Move the last key from left to parent
            this.keys[childIndex - 1] = left.keys.pop();

            // Move the last child from left to right
            right.children.unshift(left.children.pop());
            return;
        }

        // Attempt to borrow from right sibling
        if (childIndex !== this.keys.length && this.children[childIndex + 1].keys.length >= MinDegree) {
            const left = this.children[childIndex];
            const right = this.children[childIndex + 1];

            // Move key splitting siblings down to the left
            left.keys.push(this.keys[childIndex]);

            // Move the first key from right to parent
            this.keys[childIndex] = right.keys.shift();

            // Move the first child from right to left
            left.children.push(right.children.shift());
            return;
        }

        // Not enough elements to borrow from either sibling; merge siblings
        this.mergeChildren(childIndex !== this.keys.length ? childIndex : childIndex - 1);
    }

    //
    // Search utils

    isFull() {
        return this.keys.length === NumMaxKeys;
    }

    findKey(key, ctid) {
        return this.keys.findIndex(k =>
            k.key === key &&
            k.ctid.pageNumber === ctid.pageNumber &&
            k.ctid.rowNumber === ctid.rowNumber
        );
    }

    findChildIndex(key) {
        if (this.isLeaf) {
            throw new Error('Assertion failed: node is leaf')
        }

        const childIndex = this.keys.findIndex(k => key <= k.key);
        if (childIndex !== -1) {
            return childIndex;
        }

        return this.keys.length;
    }

    getPredecessorKey(idx) {
        if (this.isLeaf) {
            throw new Error('Assertion failed: node is leaf')
        }

        let current = this.children[idx];
        while (!current.isLeaf) {
            current = current.children[current.children.length - 1];
        }

        // Return might most key in predecessor subtree
        return current.keys[current.keys.length - 1];
    }

    getSuccessorKey(idx) {
        if (this.isLeaf) {
            throw new Error('Assertion failed: node is leaf')
        }

        let current = this.children[idx + 1];
        while (!current.isLeaf) {
            current = current.children[0];
        }

        // Return might most key in successor subtree
        return current.keys[0];
    }

    //
    // Split and merge utils

    splitChild(childIndex) {
        if (this.isLeaf) {
            throw new Error('Assertion failed: node is leaf')
        }

        const left = this.children[childIndex];
        const right = new BTreeNode(left.isLeaf);

        // Move half the contents of (old) left node to (new) right node
        right.keys = left.keys.splice(MinDegree);
        right.children = left.children.splice(MinDegree);

        this.children.splice(childIndex + 1, 0, right);   // Insert right node
        this.keys.splice(childIndex, 0, left.keys.pop()); // Move middle key up to parent
    }

    mergeChildren(childIndex) {
        if (this.isLeaf) {
            throw new Error('Assertion failed: node is leaf')
        }

        const left = this.children[childIndex];
        const right = this.children[childIndex + 1];

        // Insert key from parent into left
        left.keys.push(this.keys[childIndex]);

        // Merge the contents of right node into left
        left.keys = left.keys.concat(right.keys);
        left.children = left.children.concat(right.children);

        this.keys.splice(childIndex, 1);         // Remove key from parent
        this.children.splice(childIndex + 1, 1); // Remove right node from parent
    }
}

class BTree {
    constructor(keyAttribute) {
        this.root = new BTreeNode();
        this.keyAttribute = keyAttribute;
    }

    clear() {
        this.root = new BTreeNode();
    }

    insert(row) {
        if (this.root.isFull()) {
            const newRoot = new BTreeNode(false);
            newRoot.children.push(this.root);
            newRoot.splitChild(0);
            this.root = newRoot;
        }

        this.root.insert(row[this.keyAttribute], row.ctid);
    }

    delete(row) {
        this.root.deleteKey(row[this.keyAttribute], row.ctid);

        // Squash trivial root
        if (this.root.keys.length === 0 && !this.root.isLeaf) {
            this.root = this.root.children[0];
        }
    }
}
