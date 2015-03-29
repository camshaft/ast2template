process.env.AST2TEMPLATE_GLOBAL = '1';
global.AST2TEMPLATE_GLOBAL = '1';

exports.input = [
  {
    type: 'var',
    expression: 'foo = {};'
  },
  {
    type: 'expression',
    expression: 'console.log("GLOBAL", foo.bar.baz.bang);'
  },
  {
    type: 'if',
    expression: '(process.env.AST2TEMPLATE_GLOBAL === "1")',
    children: [
      {
        type: 'tag',
        name: 'div',
        buffer: true,
        children: []
      }
    ]
  },
  {
    type: 'if',
    expression: '(global.AST2TEMPLATE_GLOBAL === "1")',
    children: [
      {
        type: 'tag',
        name: 'div',
        buffer: true,
        children: []
      }
    ]
  }
];

exports.output = [
  { children: null, props: {}, tag: 'div' },
  { children: null, props: {}, tag: 'div' }
];

exports.iterations = 100;
