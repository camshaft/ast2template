exports.input = [
  {
    type: 'expression',
    expression: 'state = props = {}'
  },
  {
    type: 'expression',
    expression: 'state.value = "foobar"'
  },
  {
    type: 'expression',
    expression: 'props.value = "foobar"'
  },
  {
    type: 'var',
    expression: 's = [];'
  },
  {
    type: 'expression',
    expression: '(!!state.value || !!props.value) && s.push(\'active\')'
  },
  {
    type: 'expression',
    expression: '(true) && s.push(\'other\')'
  },
  {
    type: 'tag',
    name: 'div',
    props: {},
    children: [
      {
        type: 'expression',
        expression: 's.join(\'\\n\')',
        buffer: true
      }
    ],
    buffer: true
  }
];

exports.output = {
  tag: 'div',
  props: {},
  children: ["active\nother"]
};

exports.iterations = 1000000;
