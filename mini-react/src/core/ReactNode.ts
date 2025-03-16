import { IReactDOMNode, IReactNode } from "@/types/typing";

/** 
 * 创建文本节点虚拟 dom
 */
export const createTextNode = (value: string): IReactNode => {
    return {
        type: 'TEXT_ELEMENT',
        props: {
            nodeValue: value
        }
    }
}
/**
 * 生成一个虚拟 dom node
 * @param type 虚拟 dom 类型
 * @param props 虚拟 dom 参数
 * @param children 虚拟子节点列表
 * @returns 虚拟节点
 */
export const createElement = (type: string | Function, props: any, ...children: IReactNode[]): IReactDOMNode => {
    return {
        type,
        props: {
            ...props,
            children: children.map(item => {
                return (['string', 'number', 'bigint'].includes(typeof item)) ?
                    createTextNode(item.toString()) :
                    item
            })
        }
    };
}
/**
 * 根据类型创建 dom
 * @param type 类型
 * @returns 类型对应的真实 dom 【无属性】
 */
export const createNode = (type: string) => {
    if (type === 'TEXT_ELEMENT') { // 生成文本节点
        return document.createTextNode("");
    } else { // 递归 普通虚拟 dom 生成真实 dom 并进行 attribute 设置，子节点挂载
        return document.createElement(type);
    }
}