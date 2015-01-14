exports.input = [
  {
    type: 'expression',
    expression: 'var foo = 1'
  },
  {
    type: 'tag',
    name: 'div',
    buffer: true
  }
];

exports.output = {
  tag: 'div',
  props: {},
  children: null
};

exports.iterations = 1000000;
