// 简化处理，解决 JSX 元素隐式具有类型 "any"，因为不存在接口 "JSX.IntrinsicElements" 问题
declare namespace JSX {
    interface IntrinsicElements {
        // 基础 HTML 元素
        [elemName: string]: any; // 简化版本（实际需要详细定义）
    
        // 完整示例（以 div 为例）：
        div: ReactHTMLAttributes<HTMLDivElement>;
        span: ReactHTMLAttributes<HTMLSpanElement>;
        // ...其他 HTML 标签
      }
}
