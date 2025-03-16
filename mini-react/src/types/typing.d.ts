import type { EFiberEffectType, EPropsEffectType } from '../core/constant'
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
    effectType?: keyof typeof EFiberEffectType;
    /** 用于记录第一个有 dom 的父 fiber */
    fatherHasDom?: null | IFiberNode;
    /** diff key */
    key?: string;
    /** 当前层级的索引 */
    childIndex?: number;
    /** 位置是否发生改变 */
    isChangePos?: boolean;
    /** 子节点列表的 key-fiber 映射对象 */
    childKeyFiberMap?: null | Record<string | number, IFiberNode>;
    preFiber?: null | IFiberNode;
}
/** 更新操作记录类型 */
export declare interface IChangeRecordNode {
    /** 要更新的节点 */
    fiber: IFiberNode;
    /** 更新操作的类型 */
    effectType: keyof typeof EFiberEffectType;
    /** 原来的节点，用于替换节点时找位置 */
    oldFiber?: IFiberNode | null;
    preFiber?: null | IFiberNode;
    /** 修改属性的记录 */
    changeProps?: {
        key: string,
        effectType:  keyof typeof EPropsEffectType;
        fiber?: IFiberNode | null;
    }[];
}