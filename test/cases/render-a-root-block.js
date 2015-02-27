exports.input = [
  {
    type: 'block',
    name: '!baz',
    args: '(foo, bar)',
    children: [
      {
        buffer: true,
        type: 'tag',
        name: 'div',
        children: []
      }
    ]
  },
  {
    type: 'block',
    name: '!foobar',
    children: [
      {
        buffer: true,
        type: 'tag',
        name: 'div',
        children: []
      }
    ]
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
