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

*/
var tag = function tag(name, attrs) {

    function $oak$render(model) {
        var e = document.createElement(name);
        e.model = model
        e.dyno = []; // Holds the list of things to be dynamically updated in-place.

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
            installContents(contents, e);
        }

        return e;
    }

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
        var child = contents(e.model);
        if (typeof child === 'string') {
            child = document.createTextNode(child);
        } else if (child instanceof Array) {
            for (var i = 0; i < child.length; ++i) {
                installContents(child[i], e);
            }
        } else {
            e.appendChild(child);
        }
    } else if (contentsType === 'string') {
        e.appendChild(document.createTextNode(contents));
    } else if (contents instanceof Array) {
        // We support array type so it is easy to splice lists of
        // DOM nodes when rendering.
        for (var i = 0; i < contents.length; ++i) {
            installContents(contents[i], e);
        }
    } else if (contents) {
        e.appendChild(contents);
    }
};

function dynattr(fn, k) {
    return function (e) {
        var val = fn(e.model, k);
        if (val) {
            e.setAttribute(k, val.toString());
        } else {
            e.removeAttribute(k);
        }
    };
}

function dynstyle(fn, attr) {
    return function (e) {
        e.style[attr] = fn(e.model);
    };
}

function dynclasslist(fn, attr) {
    return function (e) {
        if (fn(e.model)) {
            e.classList.add(attr);
        } else {
            e.classList.remove(attr);
        }
    };
}

function dynmodel(fn) {
    return function (e) {
        e.model = fn(e.model);
    };
}

mod.tag = tag;
