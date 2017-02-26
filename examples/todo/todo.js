
var oak = require('../../src/oak')(document, requestAnimationFrame);
var tag = oak.tag;
var I = oak.Immutable;

var Cmd = {
    NoOp: function (model) {
        return model;
    },
    UpdateField: function (model) {
        return I.modify(model, "field", this.target.value);
    },
    EditingEntry: function (id, isEditing, model) {
        setTimeout(function (e) { e.focus(); }, 0, document.getElementById('todo-' + id));
        return I.set(model, ["entries", id, "editing"], isEditing);
    },
    UpdateEntry: function (id, task, model) {
        return I.set(model, ["entries", id, "description"], task);
    },
    Add: function (model) {
        return I.modify(model, 
            "uid", model.uid+1,
            "field", "",
            "entries", I.modify(model.entries, model.uid, newEntry(model.field, model.uid)));
    },
    Delete: function (id, model) {
        return I.modify(model, "entries", I.modify(model.entries, id, undefined));
    },
    DeleteComplete: function (model) {
        return I.modify(model, 
                "entries", I.filter(model.entries, function (e) { return !e.completed; }));
    },
    Check: function (id, isCompleted, model) {
        return I.set(model, ["entries", id, "completed"], isCompleted);
    },
    CheckAll: function (isCompleted, model) {
        return I.modify(model, 
            "entries", I.map(model.entries, function (e) {
                return I.modify(e, 'completed', isCompleted);
            }));
    },
    ChangeVisibility: function (visibility, model) {
        return I.modify(model, "visibility", visibility);
    }
};

Object.keys(Cmd).forEach(function (k) {
    var _cmd = Cmd[k];
    Cmd[k] = function () {
        return store(_cmd.apply(this, arguments));
    };
});

var cmd = oak.instantiate(document.body, view, load(), Cmd);

function newEntry(desc, id) {
    return {
        description: desc,
        completed: false,
        editing: false,
        id: id
    };
}

function emptyModel() {
    return {
        entries: {},
        visibility: "All",
        field: "",
        uid: 0
    };
}

function store(model) {
    localStorage.model = JSON.stringify(model);
    return model;
}

function load() {
    if (localStorage.hasOwnProperty('model')) {
        return JSON.parse(localStorage.model);
    } else {
        return emptyModel();
    }
}

function view(model, cmd) {
    return tag("div", 
                { model: model,
                  "class": "todomvc-wrapper", 
                  style: { visibility: "visible" }
                },
                tag("section",
                    { "class": "todoapp" },
                    viewInput(cmd),
                    viewEntries(cmd),
                    viewControls(oak.field("visibility"), oak.field("entries"), cmd)),
                infoFooter());
}

function viewInput(cmd) {
    return tag("header",
                { "class": "header" },
                tag("h1", {}, "todos"),
                tag("input",
                    { "class": "new-todo",
                      placeholder: "What needs to be done?",
                      autofocus: true,
                      value: oak.field("field"),
                      name: "newTodo",
                      oninput: function (m) { return cmd('UpdateField'); },
                      onkeydown: function (m) {
                          if (this.keyCode === 13) {
                              return cmd('Add');
                          }
                      }
                    }));
}

function viewEntries(cmd) {
    function allCompleted(model) {
        return I.all(model.entries, function (e) { return e.completed; });
    }

    function isVisible(model) {
        return function (entry) {
            switch (model.visibility) {
                case 'Completed':
                    return entry.completed;
                case 'Active':
                    return !entry.completed;
                default:
                    return true;
            }
        };
    }

    function cssVisibility(model) {
        return (I.count(model.entries) === 0) ? "hidden" : "visible";
    }

    return tag("section",
                { "class": "main",
                  style: { "visibility": cssVisibility }
                },
                tag("input",
                    { "class": "toggle-all",
                      type: "checkbox",
                      name: "toggle",
                      checked: allCompleted,
                      onclick: function (m) { return cmd('CheckAll', this.target.checked); }
                    }),
                tag("label",
                    { "for": "toggle-all" },
                    "Mark all as complete"),
                tag("ul",
                    { "class": "todo-list" },
                    oak.keyedList(
                        function data(model) {
                            return I.filter(model.entries, isVisible(model));
                        },
                        function map(entry, key, phase) {
                            switch (phase) {
                                case 'exit':
                                    this.parentNode.removeChild(this);
                                    return this;
                                case 'enter':
                                    return viewEntry(entryWithId(entry.id), cmd);
                            }
                        },
                        oak.field("id")
                    )));
}

function entryWithId(id) {
    return function (model) {
        return model.entries[id];
    };
}

function viewEntry(entry, cmd) {
    return tag('li',
               { model: entry,
                 classList: { completed: oak.field("completed"),
                              editing: oak.field("editing") } },
               tag('div',
                   {"class": "view"},
                   tag('input',
                       { "class": "toggle",
                         type: "checkbox",
                         checked: oak.field("completed"),
                         onclick: function (m) {
                            return cmd('Check', m.id, this.target.checked);
                         },
                       }),
                   tag('label',
                       { ondblclick: function (m) { return cmd('EditingEntry', m.id, true); } },
                       oak.field("description")),
                   tag('button',
                       { "class": "destroy",
                         onclick: function (m) { return cmd('Delete', m.id); }
                       })),
               tag('input',
                   { "class": "edit",
                     value: oak.field("description"),
                     name: "title",
                     id: function (m) { return 'todo-' + m.id; },
                     oninput: function (m) { return cmd('UpdateEntry', m.id, this.target.value); },
                     onblur: function (m) { return cmd('EditingEntry', m.id, false); },
                     onenter: function (m) { return cmd('EditingEntry', m.id, true); }
                   }));
}

function cached(fn) {
    var result, oldM;
    return function (m) {
        if (oldM === m) {
            return result;
        }

        oldM = m;
        result = fn(m);
        return result;
    };
}

function viewControls(visibility, entries, cmd) {
    var entriesCompleted = cached(function (m) {
        return I.count(entries(m), function (e) { return e.completed; });
    });

    var numEntries = cached(function (m) {
        return I.count(entries(m));
    });

    var entriesLeft = cached(function (m) {
        return numEntries(m) - entriesCompleted(m);
    });

    return tag("footer",
                { "class": "footer",
                  hidden: function (m) { 
                    return numEntries(m) === 0;
                  }
                },
                viewControlsCount(entriesLeft, cmd),
                viewControlsFilters(visibility, cmd),
                viewControlsClear(entriesCompleted, cmd));
}


function viewControlsCount(entriesLeft, cmd) {
    var item_ = cached(function (m) {
        return entriesLeft(m) === 1 ? " item" : " items";
    });

    return tag("span",
                { "class": "todo-count" },
                tag("strong", {}, entriesLeft),
                function (m) {
                    return item_(m) + " left";
                });
}

function viewControlsFilters(visibility, cmd) {
    return tag("ul",
                { "class": "filters" },
                visibilitySwap("#/", "All", visibility, cmd),
                " ",
                visibilitySwap("#/active", "Active", visibility, cmd),
                " ",
                visibilitySwap("#/completed", "Completed", visibility, cmd));
}

function visibilitySwap(uri, visibilityVal, actualVisibility, cmd) {
    return tag("li",
                { onclick: function (m) {
                    return cmd('ChangeVisibility', visibilityVal);
                  } },
                tag("a", 
                    { href: uri,
                      classList: { selected: function (m) { 
                        return visibilityVal === actualVisibility(m);
                      } } },
                    visibilityVal));
}

function viewControlsClear(entriesCompleted, cmd) {
    return tag("button",
                { "class": "clear-completed",
                  hidden: function (m) {
                    return entriesCompleted(m) === 0;
                  },
                  onclick: function (m) {
                    return cmd('DeleteComplete');
                  } },
                function (m) {
                    return "Clear completed (" + entriesCompleted(m) + ")";
                });
}

function infoFooter() {
    return tag('footer',
               { 'class': 'info' },
               tag('p', {}, "Double-click to edit a todo"),
               tag('p', {},
                   "Written by ",
                   tag('a', { href: 'https://github.com/srikumarks' }, "Srikumar K. S.")),
               tag('p', {},
                   "Part of ",
                   tag('a', { href: 'http://todomvc.com' }, "TodoMVC")));
}
