import type { IChangeRecordNode, IFiberNode } from "@/types/typing";
import { EFiberEffectType, EPropsEffectType } from "./constant";
import { createNode } from "./ReactNode";


/**
 * 1. 生成当前层级的 key-fiber 映射对象挂载到父节点
 * 2. 对比当前层级的新旧层级的 fiber ，查看位置是否发生改变
 * 3. 将旧层级中有对应key在新的层级没有的节点标记删除
 * @param parent 父 fiber
 * @param currentFiberArr 当前层级的 fiber 列表 
 */
export function diffFiberList(parent: IFiberNode, currentFiberArr: IFiberNode[], deleteQueue: IChangeRecordNode[] = []) {
    /** 当前层级 key-fiber 映射表 */
    const keyFiberMap = getKeyFiberMap(currentFiberArr),
        /** 旧层级 key-fiber 映射表 */
        oldKeyFiberMap = parent.oldFiber?.childKeyFiberMap || {};
    // 存储在父级 fiber 上.
    parent.childKeyFiberMap = keyFiberMap;
    Object.entries(oldKeyFiberMap || {}).forEach((item) => {
        const [oldKey, oldFiber] = item;
        if (!Object.prototype.hasOwnProperty.call(keyFiberMap, oldKey)) {
            deleteQueue.push({
                effectType: EFiberEffectType.delete,
                fiber: oldFiber
            });
        }
    })
};
/**
 * diff 算法比较新旧节点，得到要执行的操作推入操作队列
 * @param fiber 
 */
export function diffNode(fiber: IFiberNode, changeQueue: IChangeRecordNode[], deleteQueue: IChangeRecordNode[]) {
    const preFiber: IFiberNode | null = fiber?.preFiber || null;
    /** 旧层级 key-fiber 映射表 */
    const oldKeyFiberMap = fiber?.parent?.oldFiber?.childKeyFiberMap || {},
        key = fiber.key!;
    const { type, oldFiber, isChangePos } = fiber;
    // key 新旧都存在
    if (Object.prototype.hasOwnProperty.call(oldKeyFiberMap, key)) {
        if (oldFiber?.type === type) { //类型一致
            // 判断位置是否发生改变
            if (isChangePos) {// 位置改变
                changeQueue.push({
                    fiber,
                    effectType: EFiberEffectType.changePosition,
                    preFiber: typeof fiber.parent?.type === 'function' ? fiber.
                });
            }
            getFiberUpdatePropsRecords(fiber, changeQueue, oldFiber);
        } else {// 类型不一致
            Object.assign(fiber, {
                oldFiber: null// 新创建的，不需要进行子树的对比
            });
            // 原来的 dom 节点得替换成新生成的节点。
            if (typeof fiber.type === 'string')
                fiber.dom = createNode(fiber.type);
            changeQueue.push({
                fiber,
                effectType: EFiberEffectType.replaceDom,
                oldFiber
            });
            getFiberUpdatePropsRecords(fiber, changeQueue)
            if (oldFiber) { // 节点重新创建，原来的节点就应该删除
                deleteQueue.push({
                    fiber: oldFiber,
                    effectType: EFiberEffectType.delete
                });
            }
        }
    } else {// key 新的不在旧的
        changeQueue.push({
            effectType: EFiberEffectType.placement,
            fiber,
            preFiber
        });
        getFiberUpdatePropsRecords(fiber, changeQueue)
    }
}
/**
 * 
 * @param currentArr 当前层级的虚拟节点列表
 */
function getKeyFiberMap(currentFiberArr: IFiberNode[]): IFiberNode['childKeyFiberMap'] {
    return currentFiberArr.reduce((keyFiberMap, fiber, index) => {
        keyFiberMap![fiber.key || `RC${index}`] = fiber;
        return keyFiberMap;
    }, {} as IFiberNode['childKeyFiberMap'])
}

/**
 * 对比新旧 fiber 的属性，向 effect 收集数组中添加属性变化操作
 * @param fiber 新 fiber
 * @param oldFiber 旧 fiber
 */
function getFiberUpdatePropsRecords(fiber: IFiberNode, changeQueue: IChangeRecordNode[], oldFiber?: IFiberNode | null) {
    const changeProps = diffProps(fiber, oldFiber);
    if (changeProps.length)
        changeQueue.push({
            changeProps,
            fiber,
            oldFiber,// 防止无新 dom 时，少移除事件
            effectType: EFiberEffectType.updateProps
        })
}
/**
 * 对比新旧 fiber 产出 props 变化数组
 * @param newFiber 新 fiber
 * @param oldFiber 旧 fiber
 * @returns props 变化数组
 */
function diffProps(newFiber: IFiberNode, oldFiber?: IFiberNode | null) {
    const changeProps: IChangeRecordNode['changeProps'] = [];
    Object.entries(newFiber?.props || {}).forEach(item => {
        const [key, value] = item;
        if ( // 有但是值不相同或新的属性
            value !== oldFiber?.props?.[key] &&
            !["children", 'key'].includes(key)
        ) {
            changeProps.push({
                key,
                effectType: EPropsEffectType.change,
                fiber: newFiber,
            });
        }
    });
    Object.entries(oldFiber?.props || {}).forEach(item => {
        const [key] = item;
        if (
            !Object.prototype.hasOwnProperty.call(newFiber?.props || {}, key) &&
            !["children", 'key'].includes(key)
        ) {
            changeProps.push({
                key,
                effectType: EPropsEffectType.delete
            });
        }

    });
    return changeProps;
}
