exports.input = [
  {
    type: 'var',
    expression: 'obj = {foo:{}}'
  },
  {
    type: 'expression',
    expression: 'obj.foo.bar = "Hello!"'
  },
  {
    type: 'tag',
    name: 'div',
    props: {},
    children: [
      {
        type: 'expression',
        expression: 'obj.foo.bar',
        buffer: true
      }
    ],
    buffer: true
  }
];

exports.output = {
  tag: 'div',
  props: {},
  children: ["Hello!"]
};

exports.iterations = 1000000;
