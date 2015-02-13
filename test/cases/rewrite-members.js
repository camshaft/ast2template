exports.input = [
  {
    type: 'var',
    expression: 'arr = [1,2,3,4,5,6]'
  },
  {
    type: 'each',
    expression: 'arr',
    value: 'val',
    key: 'key',
    buffer: true,
    children: [
      {
        type: 'tag',
        name: 'div',
        buffer: true,
        children: [
          {
            type: 'expression',
            expression: 'arr[key]',
            buffer: true
          },
          {
            type: 'expression',
            expression: "arr[key + ''] + ''",
            buffer: true
          },
          {
            type: 'expression',
            expression: 'arr.length',
            buffer: true
          }
        ]
      }
    ]
  }
];

exports.output = [
  { children: [ 1, '1', 6 ], props: {}, tag: 'div' },
  { children: [ 2, '2', 6 ], props: {}, tag: 'div' },
  { children: [ 3, '3', 6 ], props: {}, tag: 'div' },
  { children: [ 4, '4', 6 ], props: {}, tag: 'div' },
  { children: [ 5, '5', 6 ], props: {}, tag: 'div' },
  { children: [ 6, '6', 6 ], props: {}, tag: 'div' }
];

exports.iterations = 100;
