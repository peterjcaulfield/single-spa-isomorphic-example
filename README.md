# Isomorphic Microfrontend

Example of an isomorphic microfrontend architecture implementation based on the
`single-spa` reference implementation documented [here](https://single-spa.js.org/docs/ssr-overview/).

## High-level Rendering Flow

- 1. Server process reads application shell HTML containing routing definition
  and root config import.
- 2. Server layout (object containing parsed document and resolved routes) is
  constructed via `constructServerLayout`.
- 3. On a request, server retrieves current import map and calls
  `sendLayoutHttpResponse` with a config object containing the following main
  fields:
    - incoming request url,
    - constructed routes for the application based on the application HTML shell
    - `renderApplication` function that dynamically imports the matching microfrontend server JS module and
      returns the result of an invocation of it's `serverRender` method which is
      using `reactDOMServer.renderToString` under the hood.
    - `retrieveApplicationHeaders` that dynamically imports the microfrontend server JS module and
      returns the result of an invocation of it's `getResponseHeaders` method.
- 4. `sendLayoutHttpResponse` does roughly the following internally:
    - parses the server layout parsed document to a tree object
    - iterates over the nodes of the tree transforming nodes as needed. This is
      mainly to handle the routing definition. When the parsing reaches
      the routing content, matching logic is run against constructed routes and
      the `renderApplication` function is run once a route is matched to
      generate the microfrontend HTML server side.

      Any initial page state is also added to the response via a script tag
      exposing a namespaced browser global that can then be used to share state
      between server/client in the hydration phase.

    - As each node is processed, it is then serialised before being written to a
      response body content stream which is then piped to the server response
      stream instance.
- 5. The client constructs the response from the stream eventually loading the
     browser root config which:
     - constructs the routes from the shell HTML
     - imports the matched microfrontend client JS for the route using the import map
     - constructs and boots the application using the exported lifecycle
       methods of the microfrontend module which in this case is configured to
       use a render type of `hydrate` which invokes `reactDOM.hydrate` under the
       hood.

## Points of Interest in the Architecture

- Use of streaming to speed up response to client.
- Use of NodeJS experimental
  [loader](https://nodejs.org/api/esm.html#esm_loaders) API. This is to
  facilitate the use of import maps on the server so that microfrontends are
  resolved in the same way on server/client.

## References

- https://github.com/single-spa/single-spa/issues/103
- https://github.com/isomorphic-microfrontends/root-config
- https://gist.github.com/CMCDragonkai/6bfade6431e9ffb7fe88
