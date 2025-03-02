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
    parent?: null | IFiberNode;
    sibling?: null | IFiberNode;
    props?: IReactDOMNode['props'];
    child?: null | IFiberNode;
    dom?: Node | null;
    type?: null | Function | string;
    oldFiber?: null | IFiberNode;
    effectType?: 'placement' | 'update';
}
