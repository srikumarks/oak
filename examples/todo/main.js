(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){

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

},{"../../src/oak":2}],2:[function(require,module,exports){
module.exports = function (document, requestAnimationFrame) {
var mod = {};
/**

## v1

All we want is a single function that is somewhat isomorphic to
a HTML tag so that we can construct arbitrary DOM trees programmatically
in Javascript. This will be the beginning of our "framework". There is
no fundamental "concept" that you have to get. This is purely a convenience
function that is easier to work with than DOM.

So the starter idea is that you construct a DOM tree and the insert it
into the DOM.

Ex:

var domNode = tag('div', { id: 'toplevel' }, "Hello world!");
var domNode =
     tag('svg', { id: 'graphix' },
         tag('text', { x: '30px', y: '50px' }, "Hello world!"),
         tag('line', { x1: '10px', y1: '10px', x2: '100px, y2: '100px' }));

As I said. Plain and simple .. and structure of the function calls mimic
the nested nature of the DOM nodes. Once you construct the DOM node, the final
remaining step is to insert it into the DOM. This we'll keep aside as the
trivial part of it.

## v2

We want a bit more convenience out of this simple utility. For example,
it'll be nice to be able to set handlers in the attributes objects by
automatically detecting 'onclick', 'onblur' kinds of names. This makes
for simple button configurations like this -

tag('button', { onclick: function (e) { alert('Clicked!'); } }, "Click me!");

## v3

Thus far, we're forced to deal with the 'style' attribute just like any
other. This is not very convenient as we suddenly have to switch to CSS
notation to specify this one parameter. Let's fix that so that we can now
do this -

tag('a', { href: '/somewhere', style: { background: 'red' } }, "Click me!");

## v4

In D3, the class list can be specified as an object whose keys are classes
and whose values are booleans indicating whether you want the classes to
be included in the 'class' tag attribute or not. This is also convenient
when called from Javascript. So let's add that too.

tag('div', { classList: { button: true, large: true } }, "Click me!");

## v5

Thus far, we have a good function to let us build nested DOM elements.
We can live with this for small DOM nodes. If we want to reuse pieces
of these structures, we need more abstraction ability. It is quite
useful to think of the parts of the DOM tree as derived from a single
"model" object. The way an attribute or style parameter or class
can be computed from such a model is quite simple - just use a
`function (model) {}` as the value instead of a plain value.

Just as attributes can be made dynamic through function (model),
child nodes can also be made dynamic using the same mechanism. We
now do both of these at one shot. The main offshoot of this change is
that the children can be computed *after* the parent, which wasn't
the case with the plain functional model.

tag('div', { classList: { button: true, large: true },
             model: { urgent: true },
           },
           function (model) {
              return model.urgent ? "Click me now!" : "Click me!";
           });

## v6

We now add a little bit more convenience to this scheme of things.
If we now have a function that is called to dynamically return a child,
then it would be useful to also be able to dynamically return an array
of children to be inserted at the appropriate point.

## v7

This is getting sweeter, but we now have to deal with the elephant in
the room for larger DOM structures - that we have to recreate all of it
from scratch every time something changes in the model. The question now
is whether we can retain the "functional" simplicity of what we have so far
while we incorporate a bit of efficiency there.

One thing to observe with what we have so far is that we have the
ability to lazily create children when we need them. We can exploit this
and take the laziness to a different level by lazily creating the entire
structure on demand via a "render" function. Then by keeping track of
what needs to be updated when interactions happen, we can selectively
update only those parts of the DOM tree.

What I mean is that instead of returning a fully constructed node, we
can return a "render" function which when called with the model will
update the DOM node in-place, creating the necessary structures.

To keep track of things that need to be edited upon certain changes to
the model, we introduce a new property of a DOM element called 'dyno' -
which is an array of functions to call to update the DOM tree. As we
render the first DOM, we keep track of these "dynos" and use them to
update in-place whenever the model changes.

## v8

Now, elements know how to update themselves once rendered, but we're
missing the kickstarter. As it stands, we can only call the `$oak$render`
function to create the DOM tree from scratch. It'll be nice to have a
render function that can be called to mount the tree into an existing
parent node, so that the child nodes can be kept updated in-place.

So in this version, we give the $oak$render function three methods -
`.render(parentNode, model)`, `.update(model)`
and `.refresh(model)`. The difference between `.update` and
`.refresh` is that the former updates elements in-place whereas the
latter re-renders the whole dom tree.

## v9

We kind of have a component model now, where we can create a component,
render it to a DOM parent node and subsequently have it update whenever
a "model" changes. But we can't yet build our own components. Towards
this we introduce a "bless" function that takes any function (model) {}
and turns it into a "component" by wrapping it in a function that satisfies
all our needs for it to look like a component.

## v10

We can now render and update components. However, we can't yet efficiently
update whole swathes of child components as we need to traverse or
re-create big lists. Towards this, we create a new type of sub-component
called "KeyedList" that we also support towards this.

We expose the keyedList constructor out of the module.

## v11

Thus far, we've only paid attention to creation and updation of the DOM tree.
We haven't said anything about how the model is to be updated as events pour in
from the DOM tree. There is an easy way to manage this by introducing "commands"
that invoke handlers via some kind of a dispatch mechanism.

For our purposes, we can pretend that such a dispatch occus via a
function (message, arguments...) {} kind of function. So an event handler
can be created like this -

onclick: function (event) { cmd("IncrementCounter", 1); }

The only thing we propose as part of this protocol is that the first argument
be a string identifying the command. The arguments to be command can be
derived from the event. In order to make this simpler, we introduce a
"handler" function which creates such handlers given a cmd and an instruction string.

function make(cmd) {
return tag("div",
{ style: { fontFamily: "sans-serif",
fontSize: "24pt" } },
tag("div", {}, function (model) { return model.msg; }),
tag("button", { onclick: handler(cmd, "clicked") }, "Click me!"));
}

## v12

We now lift out the dependency on "document" so that we can supply other
implementations of the DOM for, say, server-side rendering.

## v13

Some utilities for managing command actions expressed as an object.

*/
var tag = function tag(name, attrs) {
    var argv = Array.prototype.slice.call(arguments, 2);
    function $oak$render(model) {
        var e = document.createElement(name);
        e.model = model;
        // We introduce a new property of an element - the 'dyno' -
        // to hold the list of dynamic calculations and updates to be
        // done when the model changes. Each entry in the `dyno` array
        // is of the form `function (element) {}`. Within the dyno
        // updater, we can access the current model using `element.model`.
        e.dyno = [];
        // Store away the element as a render function property
        // so that it can be modified in-place.
        $oak$render.element = e;
        if (attrs) {
            for (var k in attrs) {
                var valOrFn = attrs[k];
                if (typeof valOrFn === 'function') {
                    switch (k) {
                        case 'model':
                            // This is a special attribute that we use to attach a
                            // model object to the node.
                            e.model = valOrFn(e.model);
                            // This is supposed to be dynamic, so we set things up
                            // using the 'dyno' mechanism so that this property will
                            // be updated whenever the model changes.
                            e.dyno.push(dynModel(valOrFn));
                            break;
                        case 'style':
                            processStyle(valOrFn(e.model), e);
                            e.dyno.push(dynProcessStyle(valOrFn));
                            break;
                        case 'classList':
                            processClassList(valOrFn(e.model), e);
                            e.dyno.push(dynProcessClassList(valOrFn));
                            break;
                        case 'checked':
                            e.checked = valOrFn(e.model) ? true : false;
                            e.dyno.push(dynAttr(valOrFn, k));
                            break;
                        case 'value':
                            e.value = valOrFn(e.model);
                            e.dyno.push(dynAttr(valOrFn, k));
                            break;
                        default:
                            // If an attribute key is of the form onclick/onmouseup/etc.
                            // then we treat the value as a handler to be attached 
                            // to the element. Note that within a handler of the form
                            // function (event) {...}, the model object can be accessed
                            // using `event.target.model`.
                            if (/^on/.test(k)) {
                                e.addEventListener(k.substring(2), makeEventHandler(valOrFn));
                            }
                            else {
                                // Invoke the given function to determine the value
                                // of the attribute.
                                var updateAttr = dynAttr(valOrFn, k);
                                updateAttr(e);
                                // This is a dynamic attribute, so we need to set it
                                // so that it will be updated when the model changes.
                                e.dyno.push(updateAttr);
                            }
                    }
                }
                else if (valOrFn) {
                    // Normal value to be set.
                    switch (k) {
                        case 'model':
                            e.model = valOrFn;
                            break;
                        case 'style':
                            processStyle(valOrFn, e);
                            break;
                        case 'classList':
                            processClassList(valOrFn, e);
                            break;
                        case 'checked':
                            e.checked = valOrFn ? true : false;
                            break;
                        case 'value':
                            e.value = valOrFn;
                            break;
                        default:
                            // This is surely not a handler, since the
                            // value supplied is not a function.
                            e.setAttribute(k, valOrFn.toString());
                    }
                }
            }
        }
        for (var i = 0; i < argv.length; ++i) {
            installContents(argv[i], e);
        }
        // Install the element updater method into the element itself
        // so that it can be called as e.update(model).
        e.update = update;
        return e;
    }
    $oak$render.update = oakUpdate;
    $oak$render.render = oakRender;
    $oak$render.refresh = oakRefresh;
    $oak$render.markup = '<' + [name].concat(Object.keys(attrs)).join(' ') + '>' + argv.map(function (t) { return t.markup || '?'; }).join('') + '</' + name + '>';
    return $oak$render;
};
var makeEventHandler = function makeEventHandler(fn) {
    // fn is a function (model) -> EventHandler
    // The "this" within the event handler below is the element
    // which produced the event.
    return function (event) {
        // We need to split this into two calls because
        // the first call uses the local model whereas the
        // second call is expected to run the updater using 
        // the global model.
        var eventHandler = fn.call(event, this.model);
        if (eventHandler && typeof eventHandler === 'function') {
            return eventHandler.call(this, event);
        }
        return eventHandler;
    };
};
var processStyle = function processStyle(style, e) {
    if (typeof style === 'string') {
        e.setAttribute('style', style);
        return;
    }
    for (var styleAttr in style) {
        var valOrFn = style[styleAttr];
        if (typeof valOrFn === 'function') {
            e.dyno.push(dynStyle(valOrFn, styleAttr));
            valOrFn = valOrFn(e.model);
        }
        e.style[styleAttr] = valOrFn;
    }
};
var processClassList = function processClassList(classList, e) {
    if (typeof classList === 'string') {
        e.setAttribute('class', classList);
        return;
    }
    for (var klass in classList) {
        var mem = classList[klass];
        if (typeof mem === 'function') {
            e.dyno.push(dynClassList(mem, klass));
            mem = mem(e.model);
        }
        if (mem) {
            e.classList.add(klass);
        }
        else {
            e.classList.remove(klass);
        }
    }
};
var installContents = function installContents(contents, e) {
    var contentsType = typeof contents;
    if (contentsType === 'function') {
        var child = contents(e.model);
        if (typeof child === 'undefined') {
            // If we're going to do in-place updates, then we're
            // doing to need a placeholder element which we can 
            // replace with whetever we need. Without this, in-place
            // update will not be possible.
            child = placeholder();
        }
        if (typeof child === 'string' || typeof child === 'number') {
            child = document.createTextNode(child);
        }
        e.appendChild(child);
        // If the given function happens to be one of our render
        // functions, then we need to setup dynamic update for that
        // too. Otherwise we need to setup an element replacement.
        if (contents.name === '$oak$render') {
            e.dyno.push(updater(contents));
        }
        else {
            e.dyno.push(replacer(contents, child));
        }
    }
    else if (contentsType === 'string' || contentsType === 'number') {
        e.appendChild(document.createTextNode(contents.toString()));
    }
    else if (isKeyedList(contents)) {
        installKeyedList(contents, e);
    }
    else if (typeof contents !== 'undefined' && contents !== null) {
        e.appendChild(contents);
        // If contents is itself a dynamic element, then we need
        // to be prepared to update it dynamically too.
        if (contents.dyno) {
            e.dyno.push(updater(contents));
        }
    }
};
var dynAttr = function dynAttr(fn, k) {
    return function dyno(e) {
        var val = fn(e.model, k);
        switch (k) {
            case 'checked':
                e.checked = val ? true : false;
                break;
            case 'value':
                e.value = val;
                break;
            default:
                if (val) {
                    e.setAttribute(k, val.toString());
                }
                else {
                    e.removeAttribute(k);
                }
        }
    };
};
var dynStyle = function dynStyle(fn, attr) {
    return function dyno(e) {
        e.style[attr] = fn(e.model);
    };
};
var dynClassList = function dynClassList(fn, attr) {
    return function dyno(e) {
        if (fn(e.model)) {
            e.classList.add(attr);
        }
        else {
            e.classList.remove(attr);
        }
    };
};
var dynProcessStyle = function dynProcessStyle(fn) {
    return function dyno(e) {
        processStyle(fn(e.model), e);
    };
};
var dynProcessClassList = function dynProcessClassList(fn, attr) {
    return function dyno(e) {
        processClassList(fn(e.model), e);
    };
};
var dynModel = function dynModel(fn) {
    return function dyno(e) {
        var newModel = fn(e.model);
        if (newModel === e.model) {
            return 'skip';
        }
        e.model = newModel;
    };
};
var placeholder = function placeholder() {
    var div = document.createElement('div');
    div.style.display = 'none';
    return div;
};
var replacer = function replacer(fn, child) {
    return function (e) {
        var newChild = fn(e.model);
        if (typeof newChild === 'undefined') {
            newChild = placeholder();
        }
        if (typeof newChild === 'string' || typeof newChild === 'number') {
            newChild = document.createTextNode(newChild.toString());
        }
        e.replaceChild(newChild, child);
        child = newChild;
    };
};
var updater = function updater(node) {
    return function (e) {
        // Why would we pass the e's model? This is because the
        // node is its child and might have setup a "dynamic model"
        // function when specifying its attributes. In that case,
        // what happens here is that in the dynamic update cycle,
        // the dynModel will end up setting the part of the model
        // that is relevant to the child. If it hasn't setup such
        // a dynamic model, then it needs to use the parent's new
        // model anyway.
        if (!node._parentNode) {
            node._parentNode = e;
        }
        node.update(e.model);
    };
};
var update = function update(model) {
    // 'this' is the element - i.e. the update function
    // is expected to be installed into the element.
    if (this.model === model) {
        return;
    }
    this.model = model || this.model;
    if (this.dyno) {
        for (var i = 0; i < this.dyno.length; ++i) {
            if (this.dyno[i](this) === 'skip') {
                // We're using dynModel to extract a portion of a model
                // for use by sub-components. If this submodel didn't
                // change even if the containing model changed, then there
                // is no need to update the sub-component.
                //
                // Dyno functions made by the dynABCXYZ all return undefined
                // usually ... except for dynModel, which returns
                // 'skip' in case the extracted sub-model didn't change.
                // We can break the dyno updates here if that happened.
                break;
            }
        }
    }
};
var oakUpdate = function oakUpdate(model) {
    // This is expected to be installed as a method of an
    // $oak$render function.
    return debouncedRender(this._parentNode, this, model || this.model);
};
var oakRender = function oakRender(parentNode, model) {
    return debouncedRender(parentNode, this, model);
};
var debouncedRender = function debouncedRender(parentNode, view, model) {
    debouncedRender.withinRender = debouncedRender.withinRender || 0;
    view.model = model || view.model;
    view._parentNode = parentNode || view._parentNode;
    if (!view._parentNode) {
        console.assert(!"No parent node!");
    }
    if (debouncedRender.withinRender) {
        renderStep();
        return view;
    }
    function renderStep() {
        // Mark the scheduled run as done.
        view._scheduled = null;
        try {
            debouncedRender.withinRender++;
            if (!view.element && view._parentNode) {
                // Not yet mounted.
                // Support specifying a parent node by element id as well.
                var e = typeof view._parentNode === 'string' ? document.getElementById(view._parentNode) : view._parentNode;
                e.appendChild(view(view.model));
            }
            else {
                view.element.update(view.model);
            }
        }
        finally {
            debouncedRender.withinRender--;
        }
    }
    // By scheduling to render upon requestAnimationFrame calls,
    // we avoid rendering things that don't need to be displayed,
    // while maintaining an updated model in thing.model. So that
    // when the time comes, we render based on the most recent model.
    if (!view._scheduled) {
        view._scheduled = requestAnimationFrame(renderStep);
    }
    return view;
};
// A "refresh" is simply a render into the existing parent node.
// Simple convenience function.
var oakRefresh = function oakRefresh(model) {
    return debouncedRefresh(this, model);
};
var debouncedRefresh = function debouncedRefresh(content, model) {
    return debouncedRender(null, content, model);
};
// Wrap a function (attrs,...) with appropriate protocols
// that we're using within our `tag`.
var bless = function bless(component) {
    function tag(attrs) {
        var renderer = component.apply(this, arguments);
        function $oak$render(model) {
            var e = renderer(model);
            $oak$render.element = e;
            e.dyno = e.dyno || [];
            e.update = e.update || update;
            return e;
        }
        $oak$render.render = oakRender;
        $oak$render.refresh = oakRefresh;
        $oak$render.update = oakUpdate;
        return $oak$render;
    }
    return tag;
};
// A "keyed list" is simply a triplet combining a data generating
// function, a mapper and a key extraction function with the following
// signatures -
//
// dataFn = function (model) { return array; }
//          :: model -> [datum]
// mapper = function (datum, key, selection) { return element; }
//          :: (this = element) -> datum -> String or Number -> String -> element
// keyFn = function (datum) { return stringKey; }
//          :: datum -> String or Number
//
// If you leave the keyFn out, it will be assumed to be the index
// of an array. In that case we kick into a special function to handle array
// data. Otherwise we treat it as an object whose keys may change.
var KeyedList = function KeyedList(dataFn, mapper, keyFn) {
    this.data = dataFn;
    this.map = mapper;
    this.key = keyFn || indexKeyFn;
};
var isKeyedList = function (obj) {
    return obj ? obj instanceof KeyedList : false;
};
var indexKeyFn = function indexKeyFn(d, i) {
    return i;
};
var keyedList = function keyedList(dataFn, mapper, keyFn) {
    return new KeyedList(dataFn, mapper, keyFn);
};
var installKeyedList = function installKeyedList(spec, e) {
    var install = spec.key === indexKeyFn ? installIndexKeyedList : installObjectKeyedList;
    install(spec, e);
};
var installIndexKeyedList = function installIndexKeyedList(spec, e) {
    var data = new Array(0), elements = new Array(0);
    function update(e) {
        var enterSel = new Array(0), updateSel = new Array(0);
        var newData = spec.data(e.model);
        var nk, k, j, ks;
        // Determine selections
        for (nk in newData) {
            if (elements[nk]) {
                updateSel[nk] = true;
            }
            else {
                enterSel[nk] = true;
            }
        }
        for (k in data) {
            if (!updateSel[k] && !enterSel[k]) {
                // In exitSel.
                spec.map.call(elements[k], data[k], k, "exit");
                delete elements[k];
            }
        }
        for (nk in newData) {
            if (enterSel[nk]) {
                elements[nk] = spec.map.call(e, newData[nk], nk, "enter");
            }
            else if (updateSel[nk] && elements[nk] && (elements[nk].model !== newData[nk])) {
                elements[nk].update(newData[nk]);
            }
        }
        for (ks in enterSel) {
            updateSel[ks] = ks;
            delete enterSel[ks];
        }
        data = newData;
    }
    update(e, false);
    e.dyno.push(update);
};
var installObjectKeyedList = function installObjectKeyedList(spec, e) {
    var data = {}, keys = {}, elements = {};
    function update(e) {
        var enterSel = {}, updateSel = {};
        var newData = spec.data(e.model);
        var newKeys = Immutable.map(newData, spec.key);
        // Determine selections
        for (var i in newKeys) {
            if (typeof keys[newKeys[i]] !== 'undefined') {
                updateSel[newKeys[i]] = true;
            }
            else {
                enterSel[newKeys[i]] = true;
            }
        }
        for (var k in keys) {
            if (!updateSel[k] && !enterSel[k]) {
                // In exitSel.
                spec.map.call(elements[k], data[k], k, "exit");
                delete elements[k];
            }
        }
        for (var j in newKeys) {
            var nk = newKeys[j];
            if (enterSel[nk]) {
                elements[nk] = spec.map.call(e, newData[j], nk, "enter").render(e, e.model, true).element;
            }
            else if (updateSel[nk] && elements[nk] && (elements[nk].model !== newData[nk])) {
                elements[nk].update(e.model);
            }
        }
        data = {};
        keys = {};
        for (var j in newKeys) {
            data[newKeys[j]] = newData[j];
            keys[newKeys[j]] = newKeys[j];
        }
    }
    update(e);
    e.dyno.push(update);
};
// Turns a command dispatcher into an event handler for DOM nodes.
// The "this" within the command dispatcher is set to the event so
// that more parameters can be taken from the event if necessary.
var handler = function handler(cmd, cmdName) {
    var args = Array.prototype.slice.call(arguments, 1);
    return function (event) {
        return cmd.apply(event, args);
    };
};
// Convenience function to drill down into model objects.
var field = function field(name) {
    return function (object) {
        return object[name];
    };
};
// parentNode :: DOMNode
// viewMaker :: function (model) -> function $oak$render ...
// model :: TheInitialModel
// cmd :: Map String ((..) -> model -> ())
var instantiate = function instantiate(parentNode, viewMaker, model, Cmd) {
    function renderStep(model) {
        view.render(parentNode, model);
    }
    var cmd = buildCmd(model, Cmd, renderStep);
    var view = viewMaker(model, cmd);
    renderStep(model);
    return cmd;
};
var buildCmd = function buildCmd(model, Cmd, renderStep) {
    var cmd = function cmd(instr) {
        var argv = Array.prototype.slice.call(arguments, 1);
        var modelIx = argv.length;
        // Returns a DOM-style event handler.
        return function (event) {
            argv[modelIx] = model;
            model = Cmd[instr].apply(event, argv);
            renderStep(model);
        };
    };
    cmd.task = function task(instr) {
        var argv = Array.prototype.slice.call(arguments, 1);
        argv.push(model);
        model = Cmd[instr].apply('task', argv);
        renderStep(model);
        return cmd;
    };
    return cmd;
};
// An immutable data structure that works by copying.
// Feel free to replace this with something more efficient.
var Immutable = {};
Immutable.get = function get(model, path) {
    for (var i = 0; i < path.length; ++i) {
        model = model[path[i]];
    }
    return model;
};
Immutable.set = function set(model, path, value) {
    return setHelper(model, path, 0, value);
};
function setHelper(model, path, i, value) {
    if (i + 1 === path.length) {
        return Immutable.modify(model, path[i], value);
    }
    return Immutable.modify(model, path[i], setHelper(model[path[i]], path, i + 1, value));
}
Immutable.modify = function modify(model) {
    var c = Immutable.copy(model);
    for (var i = 1; i < arguments.length; i += 2) {
        var val = arguments[i + 1];
        if (typeof val === 'undefined') {
            if (c.splice) {
                c.splice(arguments[i], 1);
            }
            else {
                delete c[arguments[i]];
            }
        }
        else {
            c[arguments[i]] = val;
        }
    }
    return c;
};
Immutable.copy = function (model) {
    if (model instanceof Array) {
        return model.slice(0);
    }
    else if (model instanceof Object) {
        var c = {};
        for (var k in model) {
            c[k] = model[k];
        }
        return c;
    }
    else {
        return model;
    }
};
Immutable.filter = function (model, fn) {
    if (model instanceof Array) {
        return model.filter(fn);
    }
    var result = {};
    for (var k in model) {
        if (fn(model[k], k)) {
            result[k] = model[k];
        }
    }
    return result;
};
Immutable.map = function (model, fn) {
    if (model instanceof Array) {
        return model.map(fn);
    }
    var result = {};
    for (var k in model) {
        result[k] = fn(model[k], k);
    }
    return result;
};
Immutable.any = function (model, fn) {
    if (model instanceof Array) {
        for (var i = 0; i < model.length; ++i) {
            if (fn(model[i], i)) {
                return { key: i };
            }
        }
        return false;
    }
    for (var k in model) {
        if (fn(model[k], k)) {
            return { key: k };
        }
    }
    return false;
};
Immutable.all = function (model, fn) {
    if (model instanceof Array) {
        for (var i = 0; i < model.length; ++i) {
            if (!fn(model[i], i)) {
                return false;
            }
        }
        return true;
    }
    for (var k in model) {
        if (!fn(model[k], k)) {
            return false;
        }
    }
    return true;
};
Immutable.count = function (model, pty) {
    var k = 0;
    if (model instanceof Array) {
        if (pty) {
            k = 0;
            for (var i = 0; i < model.length; ++i) {
                if (pty(model[i], i)) {
                    ++k;
                }
            }
            return k;
        }
        return model.length;
    }
    if (pty) {
        k = 0;
        for (var j in model) {
            if (pty(model[j], j)) {
                ++k;
            }
        }
        return k;
    }
    k = 0;
    for (var j in model) {
        ++k;
    }
    return k;
};
mod.tag = tag;
mod.bless = bless;
mod.keyedList = keyedList;
mod.handler = handler;
mod.field = field;
mod.instantiate = instantiate;
mod.buildCmd = buildCmd;
mod.Immutable = Immutable;
return mod;
};

},{}]},{},[1]);
