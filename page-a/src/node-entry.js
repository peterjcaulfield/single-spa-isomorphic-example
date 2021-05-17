import React from "react";
import ReactDOMServer from "react-dom/server.js";
import Root from "./root.component.js";

export const getResponseHeaders = (props) => {
  return {
    "x-page-a": 1,
  };
};

export async function serverRender(props) {
  const htmlStream = ReactDOMServer.renderToString(<Root {...props} />);

  return { content: htmlStream, assets: null };
}
