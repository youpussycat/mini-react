/** 
 * fiber 更新的类型
 * @description 用于在 commitRoot 时，根据不同的更新类型，进行不同的 dom 操作
 */
export enum EFiberEffectType {
    /** 挂载新节点 */
    placement = 'placement',
    /** 位置改变 */
    changePosition = 'changePosition',
    /** 改变 props */
    updateProps = 'updateProps',
    /** 新节点替换原有DOM */
    replaceDom = 'replaceDom',
    /** 删除节点 */
    delete = 'delete'
}


/** 
 * 属性 更新的类型
 * @description 用于在 commitRoot 时，根据不同的更新类型，进行不同的 dom 操作
 */
export enum EPropsEffectType {
    /** 修改属性 */
    change = 'change',
    /** 删除属性 */
    delete = 'delete'
}

