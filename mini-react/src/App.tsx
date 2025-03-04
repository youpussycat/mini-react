import React from "./core/React"
const App = React.createElement(
    'div',
    {
        id: 'test',
    },
    '111',
    '我爱我家',
    React.createElement(
        'div',
        {
            id: 'test2',
        },
        '2',
        '我更爱大家'
    )
);
let a = 11111, change: any = {};
const FCom = (props: any) => {
    return (
        <div>
            1
            <div>
                2
            </div>
            3
            <div>
                4
                <div>
                    5
                </div>
                6
            </div>
            7-------{a}---{props.a}
        </div>
    )
}
const App1 = () => (
    <div>
        111
        <div>test</div>
        222
    </div>
)
const App2 = () => (
    <div onClick={() => {
        console.log(111)
    }}>
        111
        <div>test</div>
        222
        <div>
            test2
            <div>test3<div>test3<div>test3</div></div></div>
        </div>
        111111
        <FCom a={a} />
        wq
        <button
            onClick={() => {
                a++;
                console.log(a);
                React.update()
            }}
        >测试属性更改</button>
        {a}
        <br />
        --------------------------
        <br />
        <button
            onClick={() => {
                change.normal = !change.normal;
                React.update();
            }}
        >
            测试节点替换——普通节点
        </button>
        {
            change.normal ? <div>1</div> : <div>2</div>
        }
        <br />
        <button
            onClick={() => {
                change.fun = !change.fun;
                React.update();
            }}
        
        >
            测试节点替换——函数节点
        </button>
        {
            change.fun ? <FCom a={a} /> : <App1 a={a} />
        }
        hasDOMBUG
        {false}
        {null}强强强强
    </div>
)
export default App2;