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
let a = 11111;
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
)}
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
        <FCom  a={a}/>
        wq
        <button
            onClick={() => {
                a++;
                console.log(a);
                React.update()
            }} 
        >测试</button>
        {a}
    </div>
)
export default App2;