import { opg, normalizeCondition, matchValuesWithCondition } from './'

describe('opg', () => {
  it('properly extracts keys', () => expect(opg('a', { a: 2 })).toBe(2))
  it('properly extracts nested keys', () =>
    expect(opg('a/b', { a: { b: 2 } })).toBe(2))
  it('properly defaults', () => expect(opg('a', {}, '2')).toBe('2'))
})

describe('normalizeCondition', () => {
  it('keeps already normalized condition object', () =>
    expect(normalizeCondition({ all: { a: '2' } })).toMatchObject({
      all: { a: '2' },
    }))
  it('keeps already normalized condition object', () =>
    expect(normalizeCondition({ any: { a: '2' } })).toMatchObject({
      any: { a: '2' },
    }))
  it('normalizes condition object', () =>
    expect(normalizeCondition({ a: '2' })).toMatchObject({
      all: { a: '2' },
    }))
})

describe('matchValuesWithCondition', () => {
  it('matches conditions', () =>
    expect(
      matchValuesWithCondition(
        normalizeCondition({
          a: '2',
        }),
        {
          a: '2',
        }
      )
    ).toBeTruthy())

  it('matches with pipes conditions', () =>
    expect(
      matchValuesWithCondition(
        normalizeCondition({
          images: 'align-items-center | align-items-start',
        }),
        {
          images: 'align-items-center',
        }
      )
    ).toBeTruthy())

  it("doesn't match conditions", () => {
    expect(
      matchValuesWithCondition(
        normalizeCondition({
          a: '3',
        }),
        {
          a: '2',
        }
      )
    ).toBeFalsy()
  })

  it('negates conditions', () => {
    expect(
      matchValuesWithCondition(
        normalizeCondition({
          a: '!2',
        }),
        {
          a: '2',
        }
      )
    ).toBeFalsy()
  })

  it('negates multiple conditions', () => {
    expect(
      matchValuesWithCondition(
        normalizeCondition({
          a: '! 3 | 2',
        }),
        {
          a: '4',
        }
      )
    ).toBeTruthy()
  })

  it('matches piped conditions', () => {
    expect(
      matchValuesWithCondition(
        normalizeCondition({
          a: '3 | 2',
        }),
        {
          a: '2',
        }
      )
    ).toBeTruthy()
  })

  it('matches with all matcher', () => {
    expect(
      matchValuesWithCondition(
        normalizeCondition({
          all: {
            a: '3 | 2',
            b: 'c',
          },
        }),
        {
          a: '2',
          b: 'a',
        }
      )
    ).toBeFalsy()
  })

  it('matches with all matcher', () => {
    expect(
      matchValuesWithCondition(
        normalizeCondition({
          any: {
            a: '3 | 2',
            b: 'c',
          },
        }),
        {
          a: '2',
          b: 'a',
        }
      )
    ).toBeTruthy()
  })

  it('doesnt match with ~ matcher', () => {
    expect(
      matchValuesWithCondition(
        normalizeCondition({
          a: '~boxed',
        }),
        {
          a: {
            desktop: 'wide',
            tablet: 'wide',
            mobile: 'wide',
          },
        }
      )
    ).toBeFalsy()
  })

  it('matches with ~ matcher', () => {
    expect(
      matchValuesWithCondition(
        normalizeCondition({
          a: '~boxed',
        }),
        {
          a: {
            desktop: 'wide',
            tablet: 'boxed',
            mobile: 'wide',
          },
        }
      )
    ).toBeTruthy()
  })

  it('matches with responsive that was collapsed previously', () => {
    expect(
      matchValuesWithCondition(
        normalizeCondition({
          'a/desktop': 'wide',
          'a/tablet': 'wide',
          'a/mobile': 'wide',
        }),
        {
          a: 'wide',
        }
      )
    ).toBeTruthy()
  })
})
