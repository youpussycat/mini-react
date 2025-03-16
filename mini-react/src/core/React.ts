import type { IChangeRecordNode, IFiberNode, IReactDOMNode, IReactNode } from '@/types/typing';
import { EFiberEffectType, EPropsEffectType } from './constant';
import { createElement, createNode } from './ReactNode';
import { diffFiberList, diffNode } from './diff';
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
    /** 要更新的操作集合*/
    changeQueue: IChangeRecordNode[] = [],
    /** 当前处理的函数组件的fiber节点 */
    currentFunFiber: IFiberNode | null = null,
    deleteQueue: IChangeRecordNode[] = [];
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
    // 重置更新 effect 操作列表
    return () => {
    debugger
        changeQueue = [];
        deleteQueue = []
        // 更新时将当前改变的函数组件fiber作为更新的开始节点
        // 原生元素组件不会触发更新，所以不用考虑非函数组件的 fiber 的查找与存储。
        root = {
            ...currentUpdateFiber,
            oldFiber: currentUpdateFiber,
            child: null,
        };
        // 更新链表，防止新 fiber 没有存储到链表上，导致后续更新获取旧 fiber 错误
        if (currentUpdateFiber?.parent?.childKeyFiberMap) {
            currentUpdateFiber.parent.childKeyFiberMap[currentUpdateFiber.key!] = root
        }
        if (currentUpdateFiber?.preFiber) currentUpdateFiber.preFiber.sibling = root;
        else if (currentUpdateFiber?.parent) currentUpdateFiber.parent.child = root;
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
        if (root?.parent === nextFiberUnit?.parent && root?.sibling?.key === nextFiberUnit?.key) {
            nextFiberUnit = null;
        }
    }
    if (nextFiberUnit) { // 无空余时间时，等待下一次空余时间执行剩余任务
        requestIdleCallback(workLoop);
    } else if (root) { // 所有任务完成，进行 dom 统一提交
        console.log(root, changeQueue, 'root');
        // 统一提交
        commitRoot(root.child);
        // 更新记录
        beforeRoot = root;
        root = null;
    }
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
    /** 要生成 fiber 的虚拟节点列表 */
    const children = fiber.props?.children;
    // 生成子节点列表对应的 fiber 链表
    initChildren(fiber, children || []);
}
/**
 * 1. 将子节点列表生成对应的 fiber 节点，并与父节点 fiber 结合串成链表。
 * 2. 在遍历节点的过程中，使用 diff 算法对比当前 fiber ，得到需要执行的操作
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
        newFiber: IFiberNode | null = null,
        lastIndex = 0;

    const oldKeyFiberMap = fiber?.parent?.oldFiber?.childKeyFiberMap || {};
    const childrenFiberArr: IFiberNode[] = [];
    if (typeof fiber.type !== 'function') {
        const oldF = oldKeyFiberMap[fiber.key!];
        if (oldF?.type && oldF.type === fiber.type)
            fiber.dom = oldF?.dom;
        else if (fiber.type)
            fiber.dom = createNode(fiber.type);
    }
    const fatherDomAnchor = fiber.dom ? fiber : fiber.fatherHasDom;
    // 遍历子节点列表生成对应的 fiber 节点
    children?.forEach((child, index) => {
        if (child) {// 防止当前fiber为一个false 或 null，此时应忽略该节点，当作在fiber树中不存在
            const { type, props } = child || {};
            newFiber = {
                type,
                props,
                child: null,
                parent: fiber,
                sibling: null,
                dom: null,
                oldFiber: null,
                fatherHasDom: fatherDomAnchor,
                childIndex: index,
                key: props.key || `RC${index}`,
                childKeyFiberMap: null,
                isChangePos: !!oldFiber && (oldFiber.childIndex || 0) < lastIndex,
                preFiber: prevChild
            };
            if (newFiber)
                childrenFiberArr.push(newFiber);
            if (index === 0) {
                fiber.child = newFiber;
            } else {
                prevChild!.sibling = newFiber;
            }
            // 下一个对比的是当前 旧 fiber 的兄弟
            oldFiber = oldFiber?.sibling;
            prevChild = newFiber;
        }
    });
    // 位置对比
    diffFiberList(fiber, childrenFiberArr, deleteQueue);
    // 设置 dom

    // 进行 diff 对比，根据 diff 结果修改 oldFiber ，若是子后续不需 diff 直接新建则为 null
    diffNode(fiber, changeQueue, deleteQueue);
    // 给子赋值 oldFiber
    const childrenOldKeyFiberMap = fiber.oldFiber?.childKeyFiberMap || {};
    childrenFiberArr.forEach(item => {
        item.oldFiber = childrenOldKeyFiberMap?.[item.key!];
    });
    // oldFiber 不为 null ，则表示新的链表比旧的要短，需要删除多余的旧节点
    while (oldFiber) {
        deleteQueue.push({
            effectType: EFiberEffectType.delete,
            fiber: oldFiber
        });
        oldFiber = oldFiber?.sibling;
    }
}

/** 
 * 给 dom 进行相应的属性挂载
 * @param dom 要挂载属性的 dom
 * @param props 需要挂载的属性
 */
function updateProps(changeQueue: IChangeRecordNode['changeProps']) {

    /** 是否为事件 key */
    const isEventKey = (key: string, props: any) => {
        const thirdCode = key.charCodeAt(2);
        return !Number.isNaN(thirdCode) &&
            key.startsWith('on') &&
            'A'.charCodeAt(0) <= thirdCode &&
            'Z'.charCodeAt(0) >= thirdCode &&
            typeof props[key] === 'function'
    }
    changeQueue?.forEach(item => {
        const { effectType, key, fiber } = item;
        const props = fiber?.props, dom = fiber?.dom, oldProps = fiber?.oldFiber?.props;
        if (dom) {
            switch (effectType) {
                case EPropsEffectType.change: {
                    if (key === 'nodeValue') {
                        (dom as Text).nodeValue = props?.nodeValue;
                    }
                    else if (!["children", 'key'].includes(key)) {
                        // 若是事件，则重新挂载，注意要删除之前的事件
                        if (isEventKey(key, props)) {
                            const eventKey = key.slice(2, key.length)?.toLowerCase();
                            if (oldProps?.[key])
                                dom?.removeEventListener(eventKey, oldProps?.[key])
                            dom?.addEventListener(
                                eventKey,
                                props?.[key]
                            );
                        }
                        else // 非事件则挂载属性
                            (dom as Element).setAttribute(key, props?.[key]);
                    }
                    break;
                }
                case EPropsEffectType.delete: {
                    if (!["children", 'key'].includes(key))
                        if (!props?.[key])
                            if (!isEventKey(key, props))
                                (dom as Element).removeAttribute(key);
                            else if (oldProps?.[key])
                                dom?.removeEventListener(key.slice(2, key.length)?.toLowerCase(), oldProps?.[key])
                }
            }

        }
    });

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
    // 遍历 changeQueue 中的 effect 操作
    changeQueue.forEach(record => {
        const { effectType, fiber, changeProps, oldFiber = null, preFiber } = record;
        const domNode = fiber.dom;
        switch (effectType) {
            case EFiberEffectType.placement:
                // 插入新节点及其子树
                commitPlacement(fiber, preFiber);
                break;
            case EFiberEffectType.updateProps:
                // 更新属性
                updateProps(changeProps);
                break;
            case EFiberEffectType.replaceDom:
                // 替换节点及其子树
                commitReplaceDom(fiber, oldFiber);
                break;
            case EFiberEffectType.changePosition:
                // 改变位置
                if (domNode && fiber.parent?.dom) {
                    const referenceNode = findReferenceNode(preFiber);
                    const parentDom = fiber.fatherHasDom?.dom;
                    if (referenceNode) {
                        parentDom?.insertBefore(domNode, referenceNode);
                    } else {
                        parentDom?.appendChild(domNode);
                    }
                }
                break;
            default:
                break;
        }
    });

    deleteQueue.forEach(record => {
        const { fiber } = record, fatherDom = fiber.fatherHasDom?.dom;

        // 删除节点
        if (fiber?.dom && fatherDom && fatherDom.contains(fiber.dom)) {
            fatherDom?.removeChild(fiber.dom);
        }
    })

    deleteQueue = []
    // 清空 changeQueue
    changeQueue = [];
}


/**
 * 插入新节点及其子树
 * @param fiber 要插入的 fiber 节点
 * @param prevFiber 前一个 fiber 节点
 */
function commitPlacement(fiber: IFiberNode, prevFiber?: IFiberNode | null) {
    // 之前在进行 fiber 节点生成的时候若是没dom会生成 dom 
    if (!fiber.dom) return;

    const parentDom = fiber.fatherHasDom?.dom;
    if (!parentDom) return;
    if (typeof fiber.parent?.type === 'function') debugger
    const referenceNode = findReferenceNode(prevFiber);

    if (referenceNode) {
        parentDom.insertBefore(fiber.dom, referenceNode);
    } else {
        parentDom.appendChild(fiber.dom);
    }

}
/**
 * 查找参考节点
 * @param fiber 当前 fiber 节点
 * @param prevFiber 前一个 fiber 节点
 * @returns 参考节点
 */
function findReferenceNode(prevFiber?: IFiberNode | null): Node | null {
    if (!prevFiber) return null;
    let domNode: Node | null = null;
    if (prevFiber?.dom) {
        domNode = prevFiber.dom;
    } else if (prevFiber?.type instanceof Function) {
        // 如果前一个 fiber 是函数组件，找其第一个有 DOM 的子节点
        domNode = findFirstDomChild(prevFiber);
    }
    if (domNode) {
        return domNode.nextSibling || null;
    }
    return null;
}


/**
 * 递归查找第一个有 DOM 的子节点
 * @param fiber 当前 fiber 节点
 * @returns 第一个有 DOM 的子节点
 */
function findFirstDomChild(fiber: IFiberNode | null): Node | null {
    if (!fiber) return null;
    if (fiber.dom) {
        return fiber.dom;
    }
    const child = findFirstDomChild(fiber?.child || null);
    if (child) return child;
    const subling = findFirstDomChild(fiber?.sibling || null);
    if (subling) return subling
    return null;
}

/**
 * 替换旧节点及其子树为新节点及其子树
 * @param newFiber 新的 fiber 节点
 * @param oldFiber 旧的 fiber 节点
 */
function commitReplaceDom(newFiber: IFiberNode | null, oldFiber: IFiberNode | null) {
    if (!newFiber || !oldFiber || !oldFiber.dom || typeof newFiber.type !== 'string' || !newFiber.dom) return;
    // 替换当前节点
    newFiber.fatherHasDom?.dom?.replaceChild(newFiber.dom, oldFiber.dom);
}
export default {
    createElement,
    render,
    update
}
