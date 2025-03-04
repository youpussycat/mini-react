import type { IFiberNode, IReactDOMNode, IReactNode } from '@/types/typing';
import { EFiberEffectType } from './constant';
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
    nextFiberUnit: IFiberNode | null = null,
    /** 记录上一次更新的 root ，用于对比更新 props */
    beforeRoot: IFiberNode | null = null,
    /** 更新时要删除的 fiber 节点集合 */
    deleteFibers: IFiberNode[] = [],
    /** 当前处理的函数组件的fiber节点 */
    currentFunFiber: IFiberNode | null = null;
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
 * 产生触发 dom 结构更新方法的函数
 * 
 * @description 为啥 currentFunFiber 明明是更新函数式组件的时候才赋的值，而更新时可以只触发对应函数组件的更新
 * 
 * > 写成返回回调的形式，回调调用才能触发更新，意味着该函数将会在函数组件内部最外层进行调用
 * 就像 hooks 一样。此时，由于第一次渲染 dom 是从 根节点开始的，运行到当前函数组件后，
 * currentFunFiber 由于函数组件的构建，值为当前函数组件，而该函数在函数组件初次加载就调用了
 * 导致之后产生的 update 的返回值方法都将当前函数组件的 fiber 作为闭包存储在返回值方法的内部currentUpdateFiber
 * 后续返回值函数调用，就可以以当前函数组件的 fiber 为起点更新。
 */
export const update = () => {
    let currentUpdateFiber = currentFunFiber;
    return () => {
        // 更新时将当前改变的函数组件fiber作为更新的开始节点
        // 原生元素组件不会触发更新，所以不用考虑非函数组件的 fiber 的查找与存储。
        root = {
            ...currentUpdateFiber,
            oldFiber: currentUpdateFiber
        };
        nextFiberUnit = root;
        requestIdleCallback(workLoop);
    }
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
        },
        oldFiber: beforeRoot
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
 * 将子节点列表生成对应的 fiber 节点，并与父节点 fiber 结合串成链表
 * @param fiber 父节点的 fiber 节点
 * @param children 要处理的子节点列表
 */
function initChildren(fiber: IFiberNode, children: IReactDOMNode[]) {
    /** 前一个子节点，用于遍历子节点时，将上一个节点的兄弟节点的指针指向当前节点 */
    let prevChild: IFiberNode | null = null;
    /** 当前节点的上一次渲染时的 fiber ，用于进行对比更新 */
    let oldFiber: IFiberNode | undefined | null
        = fiber?.oldFiber?.child,
        /** 当前渲染活动的当前节点的 fiber */
        newFiber: IFiberNode | null = null;
    // 遍历子节点列表生成对应的 fiber 节点
    children?.forEach((child, index) => {

        const { type, props } = child || {};
        const fatherDomAnchor = fiber.dom ? fiber : fiber.fatherHasDom;
        if (oldFiber?.type === type) { // 后续只需更新属性不需要创建 dom
            newFiber = {
                type,
                props,
                child: null,
                parent: fiber,
                sibling: null,
                dom: oldFiber?.dom,
                oldFiber,
                effectType: EFiberEffectType.update,
                fatherHasDom: fatherDomAnchor,
            };
        } else {// 后续要替换原有的 dom
            if (child) { // 当节点为 null 或是 false 时忽略
                newFiber = {
                    type,
                    props,
                    child: null,
                    parent: fiber,
                    sibling: null,
                    dom: null,
                    // 由于本层 dom 即将要改，后续的子fiber对比就没有必要了，
                    // 所以此处 oldFiber 直接置为 null，去除后续子 fiber 新旧对比
                    oldFiber: null,
                    effectType: EFiberEffectType.placement,
                    fatherHasDom: fatherDomAnchor,
                };
                
            }
            if (oldFiber) { // 节点重新创建，原来的节点就应该删除
                deleteFibers.push(oldFiber);
            }
        }
        if (index === 0) {
            fiber.child = newFiber;
        } else {
            prevChild!.sibling = newFiber;
        }
        // 下一个对比的是当前 旧 fiber 的兄弟
        oldFiber = oldFiber?.sibling;
        if (newFiber) // 防止当前fiber为一个false 或 null，此时应忽略该节点，当作在fiber树中不存在
            prevChild = newFiber;
    });
    // oldFiber 不为 null ，则表示新的链表比旧的要短，需要删除多余的旧节点
    while (oldFiber) { 
        deleteFibers.push(oldFiber);
        oldFiber = oldFiber?.sibling;
    }
}
/**
 * 给 dom 进行相应的属性挂载
 * @param dom 要挂载属性的 dom
 * @param props 需要挂载的属性
 */
function updateProps(dom: Node, props: any = {}, oldProps: any = {}) {
    /** 是否为事件 key */
    const isEventKey = (key: string) => {
        const thirdCode = key.charCodeAt(2);
        return !Number.isNaN(thirdCode) &&
            key.startsWith('on') &&
            'A'.charCodeAt(0) <= thirdCode &&
            'Z'.charCodeAt(0) >= thirdCode &&
            typeof props[key] === 'function'
    }
    // 旧属性中有，新属性中没有的删除
    Object.keys(oldProps).forEach(item => {
        if (item !== "children")
            if (!props[item])
                if (!isEventKey(item))
                    (dom as Element).removeAttribute(item);
                else
                    dom.removeEventListener(item.slice(2, item.length)?.toLowerCase(), oldProps[item])
    });

    // 其余的直接改变
    Object.keys(props).forEach(item => {
        if (item === 'nodeValue') {
            (dom as Text).nodeValue = props?.nodeValue;
        }
        else if (item !== 'children') {
            if (props[item] !== oldProps[item])
                // 若是事件，则重新挂载，注意要删除之前的事件
                if (isEventKey(item)) {
                    const eventKey = item.slice(2, item.length)?.toLowerCase();
                    dom.removeEventListener(eventKey, oldProps[item])
                    dom.addEventListener(
                        eventKey,
                        props[item]
                    );
                }
                else // 非事件则挂载属性
                    (dom as Element).setAttribute(item, props[item]);

        }
    });
}
/**
 * 给函数组件的 fiber 节点的返回值【虚拟 DOM 结构】生成对应的 fiber 链表
 * @param fiber 要函数组件的 fiber 节点
 */
function updateFunctionComponent(fiber: IFiberNode) {
    // 保存当前函数组件的 fiber ，以至于 update 时，
    // 可以让返回值形成闭包存储当前函数组件的fiber，
    // 这样触发更新时可以从此组件开始更新
    currentFunFiber = fiber;
    /** 函数组件的返回值 虚拟 DOM 结构 */
    const children = [(fiber.type as Function)?.(fiber.props)];
    // 生成链表
    initChildren(fiber, children);
}
/**
 * 根据非函数组件的 fiber 节点生成该节点对应的真实 dom ，并给子节点列表生成 fiber 链表
 * @param fiber 要生成真实节点的 fiber 节点
 */
function updateHostComponent(fiber: IFiberNode) {
    if (!fiber.dom) { // 根据类型创建 空白 dom 节点，由于更新时由原本的 dom 的原因，所以更新 props 时不会走此处
        const dom = (fiber.dom = createNode(fiber.type as string));
        // 挂载属性
        updateProps(dom, fiber.props, fiber.oldFiber?.props || {});
    }
    /** 要生成 fiber 的虚拟节点列表 */
    const children = fiber.props?.children;
    // 生成子节点列表对应的 fiber 链表
    initChildren(fiber, children || []);
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
    const { type } = fiber;
    const isFunctionComponent = typeof type === "function";
    if (isFunctionComponent) { // 处理函数组件
        updateFunctionComponent(fiber);
    } else { // 处理普通组件
        updateHostComponent(fiber);
    }
    // 有子则处理子，没子找自身或是祖父兄弟节点处理
    if (fiber?.child)
        return fiber?.child;
    // 向上查找第一个存在的父兄弟【先序遍历顺序生成，所以肯定没有处理过】
    let next = fiber
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
    if (!fiber) return;
    const { dom, child, sibling, fatherHasDom, props, oldFiber, type } = fiber;
    // 有的变动仅仅修改了 props 值，所以不会走到上方的组件更新，
    // 需要根据effectType 实现创建挂载 dom 与 dom 属性的更新
    if (fiber.effectType === EFiberEffectType.placement) {
        // 函数式组件本身的 fiber 节点不会有 dom ，所以有 dom 才进行挂载
        // fiber 子节点挂载时，应该向上查找到最近的真实父 dom 节点进行挂载
        // TODO: 条件渲染函数组件后有未改动的兄弟节点只用 appendChild 会出错，必须依靠 diff key 来进行更新
        if (dom) fatherHasDom?.dom?.appendChild(dom);
    } else if (typeof type !== 'function') { // 非函数组件才有 dom 才需要进行属性改动
        updateProps(dom!, props, oldFiber?.props)
    }
    // 先序遍历
    // 递归子
    commitRoot(child);
    // 递归兄弟节点
    commitRoot(sibling);
}
/**
 * 任务调度机制
 * 利用空余时间执行 fiber 节点生成、虚拟dom -》 真实 dom 等任务
 * @param deadline 空余时间
 * 
 * @description 为什么删除节点时，使用removeChild 而不是直接 dom.remove() 
 * > 因为第一个有 dom 的父节点以及存储到
 */
function workLoop(deadline: IdleDeadline) {
    // 有空余时间且有下一个任务, 循环执行任务
    while (deadline.timeRemaining() > 1 && nextFiberUnit) { // 根据当前节点生成下一个 fiber 节点
        nextFiberUnit = performWorkOfUnit(nextFiberUnit);
    // 更新时， root 为 fiber 树上的某个子节点，这样才能有兄弟节点
    // 下面这判断表示，下一个任务是处理 root 的兄弟节点，root 本身变更处理完毕，
    // 此时说明本次更新内容已经做完，不需要继续下去。
    if (root?.sibling?.type === nextFiberUnit?.type) {
        nextFiberUnit = null;
      }
    }
    if (nextFiberUnit) { // 无空余时间时，等待下一次空余时间执行剩余任务
        requestIdleCallback(workLoop);
    } else if (root) { // 所有任务完成，进行 dom 统一提交
        console.log(root, 'root');
        // 统一提交
        commitRoot(root.child);
        // 清除本次更新中要删除的 dom 节点
        deleteFibers.forEach(item => {
            let dom: Node | null | undefined = item.dom;
            // 由于函数组件的 fiber 节点没有 dom ，所以需要向下查找到第一个有 dom 的节点
            while (!dom && item.child) {
                dom = item.child.dom;
            }
            if (dom) { 
                // 直接父级 fiber 可能是函数组件外壳无 dom ，所以得用 fatherHasDom
                item.fatherHasDom?.dom?.removeChild(dom);
            }
        });
        // 清除本次更新的删除节点记录
        deleteFibers = [];
        // 更新记录
        beforeRoot = root;
        root = null;
    }
}

export default {
    createElement,
    render,
    update
}
