exports.input = [
  {
    type: 'tag',
    name: 'div',
    buffer: true,
    props: {
      foo: {
        args: '(bar, baz)',
        buffer: true,
        expression: [
          {
            type: 'tag',
            name: 'span',
            buffer: true
          }
        ]
      }
    }
  }
];

exports.output = {
  tag: 'div',
  props: {},
  children: null
};

exports.iterations = 1000000;
