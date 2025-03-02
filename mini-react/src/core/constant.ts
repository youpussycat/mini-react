/** 
 * fiber 更新的类型
 * @description 用于在 commitRoot 时，根据不同的更新类型，进行不同的 dom 操作
 */
export enum EFiberEffectType {
    /** 挂载新节点 */
    placement = 'placement',
    /** 更新旧节点 */
    update = 'update'
}
