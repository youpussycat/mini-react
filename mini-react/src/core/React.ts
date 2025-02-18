import type { IReactDOMNode, IReactNode } from '@/types/typing'
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
export const createElement = (type: string, props: any, ...children: IReactNode[]): IReactDOMNode => {
    return {
        type,
        props: {
            ...props,
            children: children.map(item => (typeof item === 'string') ? createTextNode(item) : item)
        }
    };
}
/**
 * 将虚拟节点生成真实节点，并挂载到容器上【递归处理】
 * @param element 虚拟 dom 
 * @param container 容器真实 dom 
 */
export const render = (element: IReactNode, container: Element) => {
    /** 最终虚拟 dom 对应的真实 dom */
    let dom: Node | null = null;
    if (typeof element === 'string') { // 直接处理字符串
        dom = document.createTextNode(element);
    }
    else if (element.type === 'TEXT_ELEMENT') { // 生成文本节点
        dom = document.createTextNode("");
        dom.nodeValue = element?.props?.nodeValue;
    } else { // 递归 普通虚拟 dom 生成真实 dom 并进行 attribute 设置，子节点挂载
        dom = document.createElement(element.type);
        Object.keys(element.props).forEach(item => {
            if (item !== 'children')
                (dom as Element).setAttribute(item, element.props[item]);
        });
        element.props?.children?.forEach(item => render(item, dom as Element));
    }
    // 挂载到容器上
    container.appendChild(dom);
}

export default {
    createElement,
    render
}
