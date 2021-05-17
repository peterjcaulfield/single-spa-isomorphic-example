import { app } from "./app.js";
import {
  constructServerLayout,
  sendLayoutHTTPResponse,
} from "single-spa-layout/server";
import _ from "lodash";
import { getImportMaps } from "single-spa-web-server-utils";

const serverLayout = constructServerLayout({
  filePath: "server/views/index.html",
});

app.use("/importmap.json", (req, res, next) => {
  const importMap = {
    imports: {
      react:
        "https://cdn.jsdelivr.net/npm/react@16.13.1/umd/react.production.min.js",
      "react-dom":
        "https://cdn.jsdelivr.net/npm/react-dom@16.13.1/umd/react-dom.production.min.js",
      "single-spa":
        "https://cdn.jsdelivr.net/npm/single-spa@5.5.3/lib/system/single-spa.min.js",
      "@acme/root-config": "http://localhost:9876/acme-root-config.js",
      "@acme/root-config/": "http://localhost:9876/",
      "@acme/page-a": "http://localhost:8080/acme-page-a.js",
      "@acme/page-a/": "http://localhost:8080/",
    },
  };

  res.json(importMap);
});

app.use("*", (req, res, next) => {
  const developmentMode = process.env.NODE_ENV === "development";
  const importSuffix = developmentMode ? `?ts=${Date.now()}` : "";

  const importMapsPromise = getImportMaps({
    // IRL this would be hosed on a separate CDN
    url: "http://localhost:9000/importmap.json",
    nodeKeyFilter(importMapKey) {
      return importMapKey.startsWith("@acme");
    },
    req,
    allowOverrides: true,
  }).then(({ nodeImportMap, browserImportMap }) => {
    global.nodeLoader.setImportMapPromise(Promise.resolve(nodeImportMap));
    if (developmentMode) {
      browserImportMap.imports["@acme/root-config"] =
        "http://localhost:9876/acme-root-config.js";
      browserImportMap.imports["@acme/root-config/"] = "http://localhost:9876/";
    }
    return { nodeImportMap, browserImportMap };
  });

  const props = {
    user: {
      id: 1,
      name: "Test User",
    },
  };

  const fragments = {
    importmap: async () => {
      const { browserImportMap } = await importMapsPromise;
      return `<script type="systemjs-importmap">${JSON.stringify(
        browserImportMap,
        null,
        2
      )}</script>`;
    },
  };

  const renderFragment = (name) => fragments[name]();

  sendLayoutHTTPResponse({
    serverLayout,
    urlPath: req.originalUrl,
    res,
    renderFragment,
    async renderApplication({ appName, propsPromise }) {
      await importMapsPromise;
      const [app, props] = await Promise.all([
        import(appName + `/server.mjs${importSuffix}`),
        propsPromise,
      ]);
      return app.serverRender(props);
    },
    async retrieveApplicationHeaders({ appName, propsPromise }) {
      await importMapsPromise;
      const [app, props] = await Promise.all([
        import(appName + `/server.mjs${importSuffix}`),
        propsPromise,
      ]);
      return app.getResponseHeaders(props);
    },
    async retrieveProp(propName) {
      return props[propName];
    },
    assembleFinalHeaders(allHeaders) {
      return Object.assign({}, Object.values(allHeaders));
    },
  })
    .then(next)
    .catch((err) => {
      console.error(err);
      res.status(500).send("A server error occurred");
    });
});
