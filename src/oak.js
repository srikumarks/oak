var mod = module.exports;

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
`.render(parentNode, model, isPure)`, `.update(model, isPure)`
and `.refresh(model, isPure)`. The difference between `.update` and
`.refresh` is that the former updates elements in-place whereas the
latter re-render the whole dom tree.

*/
var tag = function tag(name, attrs) {

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
                            e.dyno.push(dynmodel(valOrFn));
                            break;
                        case 'style':
                            processStyle(valOrFn(e.model), e);
                            break;
                        case 'classList':
                            processClassList(valOrFn(e.model), e);
                            break;
                        default:
                            // If an attribute key is of the form onclick/onmouseup/etc.
                            // then we treat the value as a handler to be attached 
                            // to the element. Note that within a handler of the form
                            // function (event) {...}, the model object can be accessed
                            // using `event.target.model`.
                            if (/^on/.test(k)) {
                                e.addEventListener(k.substring(2), valOrFn);
                            } else {
                                // Invoke the given function to determine the value
                                // of the attribute.
                                var val = valOrFn(e.model, k);
                                if (val) {
                                    e.setAttribute(k, val.toString());
                                }

                                // This is a dynamic attribute, so we need to set it
                                // so that it will be updated when the model changes.
                                e.dyno.push(dynattr(valOrFn, k));
                            }
                    }
                } else if (valOrFn) {
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
                        default:
                            // This is surely not a handler, since the
                            // value supplied is not a function.
                            e.setAttribute(k, valOrFn.toString());
                    }
                }
            }
        }

        for (var i = 2; i < arguments.length; ++i) {
            installContents(arguments[i], e);
        }

        // Install the element updater method into the element itself
        // so that it can be called as e.update(model,isPure).
        e.update = update; 
            
        return e;
    }

    $oak$render.update = oakUpdate;
    $oak$render.render = oakRender;
    $oak$render.refresh = oakRefresh;
    
    return $oak$render;
};

var processStyle = function processStyle(style, e) {
    for (var styleAttr in style) {
        e.style[styleAttr] = style[styleAttr];
    }
};

var processClassList = function processClassList(classList, e) {
    for (var klass in classList) {
        if (classList[klass]) {
            e.classList.add(klass);
        } else {
            e.classList.remove(klass);
        }
    }
};

var installContents = function installContents(contents, e) {
    var contentsType = typeof contents;
    if (contentsType === 'function') {
        var child = contents(e.model) || placeholder();
            // If we're going to do in-place updates, then we're
            // doing to need a placeholder element which we can 
            // replace with whetever we need. Without this, in-place
            // update will not be possible.
        if (typeof child === 'string') {
            child = document.createTextNode(child);
        }
        e.appendChild(child);

        // If the given function happens to be one of our render
        // functions, then we need to setup dynamic update for that
        // too. Otherwise we need to setup an element replacement.
        if (contents.name === '$oak$render') {
            e.dyno.push(updater(contents));
        } else {
            e.dyno.push(replacer(contents, child));
        }
    } else if (contentsType === 'string') {
        e.appendChild(document.createTextNode(contents));
    } else if (contents) {
        e.appendChild(contents);

        // If contents is itself a dynamic element, then we need
        // to be prepared to update it dynamically too.
        if (contents.dyno) {
            e.dyno.push(updater(contents));
        }
    }
};

var dynattr = function dynattr(fn, k) {
    return function (e) {
        var val = fn(e.model, k);
        if (val) {
            e.setAttribute(k, val.toString());
        } else {
            e.removeAttribute(k);
        }
    };
};

var dynstyle = function dynstyle(fn, attr) {
    return function (e) {
        e.style[attr] = fn(e.model);
    };
};

var dynclasslist = function dynclasslist(fn, attr) {
    return function (e) {
        if (fn(e.model)) {
            e.classList.add(attr);
        } else {
            e.classList.remove(attr);
        }
    };
};

var dynmodel = function dynmodel(fn) {
    return function (e) {
        e.model = fn(e.model);
    };
};

var placeholder = function placeholder() {
    var div = document.createElement('div');
    div.style.display = 'none';
    return div;
};

var replacer = function replacer(fn, child) {
    return function (e) {
        var newChild = fn(e.model) || placeholder();
        if (typeof newChild === 'string') {
            newChild = mod.dom.createTextNode(newChild);
        }
        e.replaceChild(newChild, child);
        child = newChild;
    };
};

var updater = function updater(node) {
    return function (e, isPure) {
        // Why would we pass the e's model? This is because the
        // node is its child and might have setup a "dynamic model"
        // function when specifying its attributes. In that case,
        // what happens here is that in the dynamic update cycle,
        // the dynmodel will end up setting the part of the model
        // that is relevant to the child. If it hasn't setup such
        // a dynamic model, then it needs to use the parent's new
        // model anyway.
        node.update(e.model, isPure);
    };
};

var update = function update(model, isPure) {
    // 'this' is the element - i.e. the update function
    // is expected to be installed into the element.
    if (isPure && this.model === model) {
        return;
    }
    this.model = model || this.model;
    if (this.dyno) {
        for (var i = 0; i < this.dyno.length; ++i) {
            this.dyno[i](this, isPure);
        }
    }
};

var oakUpdate = function oakUpdate(model, isPure) {
    // This is expected to be installed as a method of an
    // $oak$render function.
    return this.element.update(model || this.model, isPure);
};

var oakRender = function oakRender(parentNode, model, isPure) {
    return debouncedRender(parentNode, this, model, isPure);
};

var debouncedRender = function debouncedRender(parentNode, view, model, isPure) {
    view.model = model || view.model;
    view._isPure = isPure;
    view._parentNode = parentNode || view._parentNode;
    if (view._scheduled) {
        return; // We're already scheduled to render.
    }

    // By scheduling to render upon requestAnimationFrame calls,
    // we avoid rendering things that don't need to be displayed,
    // while maintaining an updated model in view.model. So that
    // when the time comes, we render based on the most recent model.
    view._scheduled = requestAnimationFrame(function () {
        // Mark the scheduled run as done.
        view._scheduled = null;
        
        if (!view.element && view._parentNode) {
            // Not yet mounted.

            // Support specifying a parent node by element id as well.
            var e = typeof view._parentNode === 'string' ? document.getElementById(view._parentNode) : view._parentNode;

            e.appendChild(view(view.model));
        } else {
            view.update(view.model, view._isPure);
        }
    });

    return view;
};

// A "refresh" is simply a render into the existing parent node.
// Simple convenience function.
var oakRefresh = function oakRefresh(model, isPure) {
    return debouncedRefresh(this, model, isPure);
};

var debouncedRefresh = function debouncedRefresh(content, model, isPure) {
    return debouncedRender(null, content, model, isPure);
};

mod.tag = tag;

