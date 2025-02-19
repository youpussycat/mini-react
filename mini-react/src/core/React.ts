import type { IFiberNode, IReactDOMNode, IReactNode } from '@/types/typing';
/** 
 * fiber 框架渲染时，容器 dom 对应的 fiber 节点， 当没有渲染任务时为 null
 * 
 * 之所以设置在外部而不是闭包是为了：
 * > 在触发多次渲染，但是渲染的根容器不同时，直接替换容器节点防止渲染受到旧内容节点干扰
 */
let root: IFiberNode | null = null,
    /** 
     * 下一个 fiber 任务的 fiber 节点
     * 
     * 之所以设置在外部而不是闭包是为了：
     * 
     * > 在触发多次渲染时，最后一个渲染直接将 nextFiberUnit 修改忽略前面的渲染，直接生效最后一次
     */
    nextFiberUnit: IFiberNode | null = null;
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
export const render = (element: IReactDOMNode, container: Element) => {

    root = {
        dom: container,
        props: {
            children: [element],
        }
    };
    nextFiberUnit = root;
    requestIdleCallback(workLoop);
}
/**
 * 根据类型创建 dom
 * @param type 类型
 * @returns 类型对应的真实 dom 【无属性】
 */
const createNode = (type: string) => {
    if (type === 'TEXT_ELEMENT') { // 生成文本节点
        return document.createTextNode("");
    } else { // 递归 普通虚拟 dom 生成真实 dom 并进行 attribute 设置，子节点挂载
        return document.createElement(type);
    }
}
/**
 * 给 dom 进行相应的属性挂载
 * @param dom 要挂载属性的 dom
 * @param props 需要挂载的属性
 */
function updateProps(dom: Node, props: any) {
    Object.keys(props).forEach(item => {
        if (item === 'nodeValue')
            (dom as Text).nodeValue = props?.nodeValue;
        else if (item !== 'children')
            (dom as Element).setAttribute(item, props[item]);
    });
}

/**
 * fiber 框架单个任务执行过程：根据虚拟节点创建 fiber 节点链表的同时生成对应真实 dom 
 * 
 * @description fiber 节点需要将节点关系【父，子，兄弟】表述明确而不是单纯的使用 next 指向下一个要遍历的节点，
 * 因为 react 在执行一些副作用时，需要按照树节点的关系的顺序执行副作用， next 无法直接得到节点之间的结构关系。
 * 
 * @returns 下一个要执行的任务的 fiber 节点
 */
function performWorkOfUnit(fiber: IFiberNode): IFiberNode | null {
    if (!fiber) return null;
    /** 最终虚拟 dom 对应的真实 dom */
    let dom: Node | null = null;
    const { props, parent } = fiber;
    let preFiber: IFiberNode | null = null;
    // 根据当前 fiber 创建后续 fiber 链表
    props?.children?.forEach((child: IReactDOMNode, index) => {
        const { type, props } = child;
        dom = createNode(type);
        updateProps(dom, props);
        const newFiber: IFiberNode = {
            parent: fiber,
            sibling: null,
            props,
            child: null,
            dom
        }
        if (index === 0) { // 父与第一个子联立
            fiber.child = newFiber;
        } else if (preFiber) { // 兄弟间联立
            preFiber.sibling = newFiber;
        }
        preFiber = newFiber;
    });
    if (fiber.child)
        return fiber.child;
    if (fiber.sibling) return fiber.sibling;
    // 向上查找第一个存在的父兄弟【先序遍历顺序生成，所以肯定没有处理过】
    let next = parent
    while (!next?.sibling && next?.parent) {
        next = next.parent;
    }
    return next?.sibling || null;
}
/** 
 * 统一提交
 * 遍历 fiber 链表，使用递归统一完成 fiber 节点生成真实节点 * 
 * @param fiber 当前处理的 fiber 节点 
 * 
 * 
 * @description 必须先序遍历实现，不然的话，节点渲染顺序会紊乱
 * 
 * 比如层级遍历，函数组件的嵌套会使得函数组件真是要渲染的节点在链表中靠后，
 * 这样使用 appendChild 就会使得渲染的真实节点挂载位置可能在函数组件的所有兄弟节点的后面， 但是实际应该是渲染在函数组件的位置上
 * 
 * 
 * @description React 在 DOM 节点创建时没有直接在顶层使用 Fragment 实现统一提交，而是选择后续递归创建节点挂载，主要有以下几个原因：
1. 灵活性

> a. 递归挂载：React 的递归挂载方式允许在组件树的任何位置动态生成和插入节点，这种方式更具灵活性，能够处理复杂的组件结构和条件渲染。

> b. Fragment 限制：Fragment 主要用于分组多个子节点而不引入额外 DOM 节点，但它无法直接处理复杂的挂载逻辑，如条件渲染、动态插入等。

2. 性能优化

> a. 增量渲染：React 使用 Fiber 架构实现增量渲染，递归挂载可以更好地与 Fiber 的调度机制结合，实现高效的渲染和更新。

> b. 统一提交：虽然 Fragment 可以实现某种程度的统一提交，但递归挂载结合 Fiber 架构能更精细地控制渲染过程，减少不必要的 DOM 操作，提升性能。

3. 一致性

> a. 统一处理：递归挂载确保所有节点（无论是根节点还是子节点）都经过相同的创建和挂载流程，保持一致性，简化代码逻辑。

> b. 生命周期管理：递归挂载便于在节点创建和挂载过程中触发相应的生命周期钩子，确保组件生命周期的正确执行。

4. 错误处理和调试

> a. 错误边界：递归挂载使得 React 可以在每个组件层级设置错误边界，更好地捕获和处理错误。

> b. 调试友好：递归挂载生成的组件树结构更清晰，便于开发者调试和理解代码执行流程。
 
5. 未来扩展

> 新特性支持：递归挂载为 React 未来的新特性（如并发模式、Suspense 等）提供了更好的支持，这些特性需要精细的渲染控制，Fragment 无法满足这些需求。
 */
function commitRoot(fiber?: IFiberNode | null) {
    console.log(22222);
    
    if (!fiber) return;
    const { dom, child, sibling, parent } = fiber;
    if (dom)
        parent?.dom?.appendChild(dom);
    commitRoot(child);
    commitRoot(sibling);
}
/**
 * 任务调度机制
 * 利用空余时间执行 fiber 节点生成、虚拟dom -》 真实 dom 等任务
 */
function workLoop(deadline: IdleDeadline) {
    // 有空余时间且有下一个任务, 循环执行任务
    while (deadline.timeRemaining() > 1 && nextFiberUnit) { // 根据当前节点生成下一个 fiber 节点
        nextFiberUnit = performWorkOfUnit(nextFiberUnit);
    }
    if (nextFiberUnit) { // 无空余时间时，等待下一次空余时间执行剩余任务
        requestIdleCallback(workLoop);
    } else if (root) { // 所有任务完成，进行统一提交
        commitRoot(root.child);
    }
}

export default {
    createElement,
    render
}
