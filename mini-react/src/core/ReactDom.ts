import { IReactDOMNode } from "@/types/typing.js";
import React from "./React.js";
const ReactDOM = {
  createRoot(container: Element| null) {
    return {
      render(App: IReactDOMNode) {
        if (container)
          React.render(App, container);
      },
    };
  },
};

export default ReactDOM;
