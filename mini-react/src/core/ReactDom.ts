import { IReactDOMNode } from "@/types/typing.js";
import React from "./React.js";
const ReactDOM = {
  createRoot(container: Element) {
    return {
      render(App: IReactDOMNode) {
        React.render(App, container);
      },
    };
  },
};

export default ReactDOM;
