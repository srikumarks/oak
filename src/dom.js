
function Node(type) {
    this._type = type;
    this.children = [];
    this.parentNode = null;
    this._attributes = [];
    this._eventListeners = [];
    this.style = {};
    this.classList = MakeClassList([]);

    var self = this;
    
    Object.defineProperty(this, 'id', {
        get: function () { return self.getAttribute('id'); },
        set: function (val) { return self.setAttribute('id', val); }
    });

    Object.defineProperty(this.style, 'class', {
        get: function () { return self.classList.join(' '); },
        set: function (val) {
            self.classList.splice(0, self.classList.length); 
            self.classList.push.apply(self.classList, val.split(/\s+/));
        }
    });
}

function MakeClassList(cl) {
    cl.add = function (k) {
        this.push(k);
        this.sort();
    };

    cl.remove = function (k) {
        var i = this.indexOf(k);
        if (i >= 0) {
            this.splice(i, 1);
        }
    };

    return cl;
}

Node.prototype.appendChild = function (node) {
    if (node.parentNode) {
        node.parentNode.removeChild(node);
    }
    
    this.children.push(node);
    node.parentNode = this;
    return node;
};

Node.prototype.removeChild = function (node) {
    var i = this.children.indexOf(node);
    if (i >= 0) {
        this.children.splice(i, 1);
        node.parentNode = null;
        return node;
    }
    return null;
};

Node.prototype.replaceChild = function (newNode, currNode) {
    var i = this.children.indexOf(currNode);
    if (i >= 0) {
        currNode.parentNode = null
        this.children[i] = newNode;
        newNode.parentNode = this;
        return newNode;
    }
    return null;
};

Node.prototype.addEventListener = function (eventName, listener) {
    this._eventListeners.push({eventName: eventName, listener: listener});
};

Node.prototype.getAttribute = function (attr) {
    for (var i = 0; i < this._attributes.length; ++i) {
        if (this._attributes[i][attr]) {
            return this._attributes[i][attr];
        }
    }
    return null;
};

Node.prototype.setAttribute = function (attr, val) {
    var obj = {};
    obj[attr] = val;
    this._attributes.unshift(obj);
    return val;
};

function Document() {
    this.nodes = [];
}

Document.prototype.createElement = function (tag) {
    var n = new Node(tag);
    this.nodes.push(n);
    return n;
};

Document.prototype.createTextNode = function () {
    return this.createElement('$text');
};

Document.prototype.getElementById = function (id) {
    return findRec(this.nodes, 0, id);
};

function findRec(nodes, i, id) {
    if (!nodes) {
        return null;
    }

    if (i >= nodes.length) {
        return null;
    }

    if (nodes[i].id === id) {
        return nodes[i];
    }

    var r = findRec(nodes[i].children, 0, id);
    if (r) {
        return r;
    }

    return findRec(nodes, i+1, id);
}


module.exports = new Document;
