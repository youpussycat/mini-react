import { IReactNode } from "@/types/typing.js";
import React from "./React.js";
const ReactDOM = {
  createRoot(container: Element) {
    return {
      render(App: IReactNode) {
        React.render(App, container);
      },
    };
  },
};

export default ReactDOM;
