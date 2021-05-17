const webpackMerge = require("webpack-merge");
const singleSpaDefaults = require("webpack-config-single-spa-react");
const path = require("path");
const EsmWebpackPlugin = require("@purtuga/esm-webpack-plugin");

module.exports = (webpackConfigEnv) => {
  const defaultConfig = singleSpaDefaults({
    orgName: "acme",
    projectName: "page-a",
    webpackConfigEnv,
  });

  const serverConfig = singleSpaDefaults({
    orgName: "acme",
    projectName: "page-a",
    webpackConfigEnv,
  });

  defaultConfig.plugins = defaultConfig.plugins.filter(
    (p) => p.constructor.name !== "CleanWebpackPlugin"
  );

  /**
   * Public path plugin needs to be filtered out as we don't load async
   * chunks on the server.
   *
   * This isn't filtered out in the single-spa isomorphic example code for
   * some reason
   */
  serverConfig.plugins = serverConfig.plugins.filter(
    (p) =>
      !["CleanWebpackPlugin", "SystemJSPublicPathWebpackPlugin"].includes(
        p.constructor.name
      )
  );

  const final = [
    webpackMerge.smart(defaultConfig, {}),
    webpackMerge.smart(serverConfig, {
      // modify the webpack config however you'd like to by adding to this object
      target: "node",
      mode: "development",
      entry: path.resolve(process.cwd(), "src/node-entry.js"),
      output: {
        library: "acme",
        libraryTarget: "var",
        filename: "server.mjs",
      },
      externals: defaultConfig.externals
        .concat(/react-dom\/.+/)
        .concat(/^@acme\/?.*$/),
      plugins: [
        new EsmWebpackPlugin({
          moduleExternals: true,
        }),
      ],
    }),
  ];

  console.log(final[1].plugins);

  return final;
};
