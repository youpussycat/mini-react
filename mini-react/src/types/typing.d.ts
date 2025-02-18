/** 虚拟节点类型 */
export declare interface IReactDOMNode {
    /** 虚拟节点类型 */
    type: string;
    /** 虚拟节点参数 */
    props: {
        /** 虚拟子节点列表 */
        children?: IReactDOMNode[];
        [key: string]: any;
    };
}
/**  React 节点类型 */
export declare type  IReactNode = IReactDOMNode | string;
