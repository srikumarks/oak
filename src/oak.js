var mod = module.exports;

/**

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

*/
var tag = function tag(name, attrs) {
    var e = document.createElement(name);
    if (attrs) {
        for (var k in attrs) {
            e.setAttribute(k, attrs[k]);
        }
    }
    for (var i = 2; i < arguments.length; ++i) {
        e.appendChild(arguments[i]);
    }
    return e;
};

mod.tag = tag;
