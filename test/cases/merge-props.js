exports.input = [
  {
    type: 'var',
    expression: 'nested = {props:{were:{here:{foo:true}}}}'
  },
  {
    type: 'tag',
    name: 'div',
    props: {
      '&props': {
        expressions: [
          '{name: "foo"}',
          'nested.props.were.here',
          '{style: {color: "red"}}',
          '{style: {background: "blue"}}'
        ]
      }
    },
    buffer: true
  }
];

exports.output = {
  tag: 'div',
  props: {
    name: 'foo',
    foo: true,
    style: {
      background: 'blue',
      color: 'red'
    }
  },
  children: null
};

exports.iterations = 1000000;
