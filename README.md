# match-conditions

Match a set of conditions for a collection of key-value pairs. Conditions are able to access nested keys.

## Install

```bash
yarn add match-conditions
```

## Usage

```javascript
import { normalizeCondition, matchValuesWithCondition } from 'match-conditions'

// true
matchValuesWithCondition(
  normalizeCondition({
    a: '2'
  }),
  {
    a: '2'
  }
)

// false
matchValuesWithCondition(
  normalizeCondition({
    a: '3'
  }),
  {
    a: '2'
  }
)

// true
matchValuesWithCondition(
  normalizeCondition({
    any: {
      a: '3 | 2',
      b: 'c'
    }
  }),
  {
    a: '2',
    b: 'a'
  }
)
```
