# oak

A React-like js framework using model-diffing instead of DOM-diffing, for instructional purposes.

If you follow the sequence of commit and the commit messages, you can
follow the evolution of the "framework" as a series of choices made
in the design of a Javascript function that bears close resemblance
to the HTML that it produces and, more importantly, maintains.

- Play with the traditional [TodoMVC example].
- Checkout the [TodoMVC source] code (ported from Elm's version).
- Efficient updating is achieved using "model diffing".
- Includes a "by copy" implementation of immutable structs.
- Inspired by [Elm], but in plain JS.

[TodoMVC example]: https://cdn.rawgit.com/srikumarks/oak/09181993/examples/todo/main.html
[TodoMVC source]: https://github.com/srikumarks/oak/blob/master/examples/todo/todo.js
[Elm]: https://elm-lang.org
