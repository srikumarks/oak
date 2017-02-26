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

*/
var tag = function tag(name, attrs) {
    var e = document.createElement(name);
    if (attrs) {
        for (var k in attrs) {
            // If an attribute key is of the form onclick/onblur/onmouseup/etc.
            // then we treat the value as a handler to be attached 
            // to the element.
            if (/^on/.test(k)) {
                e.addEventListener(k, attrs[k]);
            } else {
                switch (k) {
                    case 'style': 
                        processStyle(attrs[k], e);
                        break;
                    default:
                        e.setAttribute(k, attrs[k]);
                }
            }
        }
    }
    for (var i = 2; i < arguments.length; ++i) {
        // We support plain strings. Just turn them into text nodes.
        if (typeof arguments[i] === 'string') {
            e.appendChild(document.createTextNode(arguments[i]));
        } else {
            e.appendChild(arguments[i]);
        }
    }
    return e;
};

var processStyle = function processStyle(style, e) {
    for (var styleAttr in style) {
        e.style[styleAttr] = style[styleAttr];
    }
};

mod.tag = tag;
