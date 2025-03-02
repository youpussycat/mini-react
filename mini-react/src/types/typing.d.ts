/** 虚拟节点类型 */
export declare interface IReactDOMNode {
    /** 虚拟节点类型 */
    type: string | Function;
    /** 虚拟节点参数 */
    props: {
        /** 虚拟子节点列表 */
        children?: IReactDOMNode[];
        [key: string]: any;
    };
}
/**  React 节点类型 */
export declare type  IReactNode = IReactDOMNode | string;
/** fiber 节点数据类型 */
export declare interface IFiberNode {
    /** 用于记录当前 fiber 节点的父节点 */
    parent?: null | IFiberNode;
    /** 用于记录当前 fiber 节点的兄弟 fiber 节点 */
    sibling?: null | IFiberNode;
    /** 用于记录当前 fiber 节点的 props */
    props?: IReactDOMNode['props'];
    /** 用于记录当前 fiber 节点的子 fiber 节点 */
    child?: null | IFiberNode;
    /** 用于记录当前 fiber 节点对应的真实 dom 节点 */
    dom?: Node | null;
    /** 用于记录当前 fiber 节点的类型 */
    type?: null | Function | string;
    /** 用于记录更新前的 fiber 节点 */
    oldFiber?: null | IFiberNode;
    /** 用于记录更新的类型 */
    effectType?: 'placement' | 'update';
    /** 用于记录第一个有 dom 的父 fiber */
    fatherHasDom?: null | IFiberNode;
}
