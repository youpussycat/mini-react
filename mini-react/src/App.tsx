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
const App2 = (
    <div>
        111
        <div>test</div>
        222
        <div>
            test2
            <div>test3<div>test3<div>test3</div></div></div>
        </div>
        111111
        wq
    </div>
)
export default App2;