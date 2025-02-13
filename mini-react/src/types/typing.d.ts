/** 虚拟节点类型 */
export declare interface IReactDOMNode {
    /** 虚拟节点类型 */
    type: string;
    /** 虚拟节点参数 */
    props: any;
    /** 虚拟子节点列表 */
    children?: IReactDOMNode[];
}
/**  React 节点类型 */
export declare type  IReactNode = IReactDOMNode | string;
