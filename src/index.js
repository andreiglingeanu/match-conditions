/**
 * Get nested property value
 *
 * Usage:
 * var obj = {foo: {bar: 'ok'}};
 * opg('foo/bar', obj); // 'ok'
 *
 * @param {String} properties 'a.b.c'
 * @param {Object} obj
 * @param {*} [defaultValue] If property will not exist
 * @param {String} [delimiter] Default '/'
 */
export const opg = (properties, obj, defaultValue) => {
  const delimiter = '/'

  if (typeof properties == 'string') {
    properties = properties.split(delimiter)
  } else {
    properties = [properties]
  }

  var property = properties.shift()

  if (!obj || typeof obj[property] == 'undefined') {
    return defaultValue
  }

  if (properties.length) {
    properties = properties.join(delimiter)

    return opg(properties, obj[property], defaultValue, delimiter)
  } else {
    return obj[property]
  }
}

const propertiesWithoutLast = (properties) => {
  const delimiter = '/'

  if (typeof properties == 'string') {
    properties = properties.split(delimiter)
  }

  if (properties.length > 1) {
    properties.pop()
  }

  return properties
}

export const normalizeCondition = (conditionDescriptor) => {
  if (!conditionDescriptor.all) {
    if (!conditionDescriptor.any) {
      conditionDescriptor = {
        all: conditionDescriptor,
      }
    }
  }

  return conditionDescriptor
}

/**
 * Support:
 *
 * // TODO: maybe implement short circuits for conditions
 *
 * {
 *   'path/to/elem':         'exact_value',
 *   'path/to/other_elem':   '! negated_exact_value',
 *   'path/to/other_elem_1': 'first_val | second_val | third_possible_val',
 *   'path/to/other_elem_2': '! first_val | second_val',
 * }
 */
export const matchValuesWithCondition = (
  conditionDescriptor,
  inferedValuesForContext
) => {
  let conditionsObject = Object.values(conditionDescriptor)[0]

  const maybeGetMatcher = (matcher) => {
    if (matcher.length > 4) {
      return false
    }

    if (matcher.indexOf('any') === 0) {
      return 'any'
    }

    if (matcher.indexOf('all') === 0) {
      return 'all'
    }

    return false
  }

  const valuesToCheck = Object.keys(conditionsObject).map(
    (singleOptionPath, index) => {
      let maybeThat = Object.values(conditionsObject)[index]

      if (
        maybeGetMatcher(singleOptionPath) === 'all' ||
        maybeGetMatcher(singleOptionPath) === 'any'
      ) {
        return matchValuesWithCondition(
          {
            [singleOptionPath]: maybeThat,
          },
          inferedValuesForContext
        )
      }

      return tryToMatchValueWithOptionPath(
        maybeThat,
        singleOptionPath,
        inferedValuesForContext
      )
    }
  )

  if (maybeGetMatcher(Object.keys(conditionDescriptor)[0]) === 'all') {
    return valuesToCheck.every((v) => !!v)
  }

  if (maybeGetMatcher(Object.keys(conditionDescriptor)[0]) === 'any') {
    return valuesToCheck.some((v) => !!v)
  }
}

function extractScalarValueFor(singleOptionPath, inferedValuesForContext) {
  const getAsInfered = (path, values = inferedValuesForContext) =>
    opg(path, values)

  if (singleOptionPath.indexOf(':') > -1) {
    /**
     * Congrats, gentlemans, we are having a custom matcher here
     * To be honest, this is the dumbest thing I can figure out right now.
     * There probably is a better way to handle that. One could go about
     * getting an interface here or smth like that.
     *
     * WARNING: Hardcoded to ct-select.
     * Also doesn't work with ct-inherit, will report the value
     * incorrectly. Will be fixed properly when implementing the context
     * asbtraction properly.
     *
     * choices matcher
     * option_id:choices => LENGTH
     */

    let value = null
    ;((thing, cb) => cb(thing))(
      singleOptionPath.split(':'),
      ([singleOptionPath, ...matcher]) => {
        // TODO: start implementing matchers after we are done with
        // everything else with Vue renderer

        matcher = matcher.join(':')

        if (matcher === 'visibility') {
          value = getAsInfered(singleOptionPath, {
            ...inferedValuesForContext,
            [propertiesWithoutLast(singleOptionPath)]: opg(
              propertiesWithoutLast(singleOptionPath),
              inferedValuesForContext
            )[inferedValuesForContext.wp_customizer_current_view]
              ? 'yes'
              : 'no',
          })
        }

        if (matcher === 'responsive') {
          value = getAsInfered(singleOptionPath, {
            ...inferedValuesForContext,

            [propertiesWithoutLast(singleOptionPath)]:
              opg(
                propertiesWithoutLast(singleOptionPath),
                inferedValuesForContext
              )[inferedValuesForContext.wp_customizer_current_view] ||
              opg(
                propertiesWithoutLast(singleOptionPath),
                inferedValuesForContext
              ),
          })
        }

        if (matcher === 'truthy') {
          value = !!getAsInfered(singleOptionPath) ? 'yes' : 'no'
        }

        if (matcher.indexOf('array-ids') > -1) {
          const [
            arrayIdsDescriptor,
            id,
            path,
            defaultValue = 'no',
          ] = matcher.split(':')

          let maybeValue =
            arrayIdsDescriptor.indexOf('array-ids-') > -1
              ? arrayIdsDescriptor.split('-')[2]
              : false

          const properValue = getAsInfered(singleOptionPath)
            .filter((v) => v.id === id)
            .filter((v) => {
              if (maybeValue) {
                return maybeValue === opg(path, v).toString()
              }

              return true
            })

          value =
            properValue.length === 0
              ? defaultValue
              : opg(path, properValue[0]) || 'no'
        }

        if (matcher.indexOf('json:') > -1) {
          value = getAsInfered(
            `${singleOptionPath}/${matcher.split(':')[1]}`
          ).toString()
        }

        if (matcher === 'array_length') {
          let properValue = getAsInfered(singleOptionPath)

          value = (properValue || []).length.toString()
        }

        if (!value) {
          throw new Error(
            `Unknown matcher received. Please verify for typos. The received matcher: ${matcher}.`
          )
        }
      }
    )

    /**
     * Matcher got _matched_.
     */
    if (value) {
      return value
    } else {
      // Fall back to raw value check, but omit the matcher.
      singleOptionPath = singleOptionPath.split(':')[0]
    }
  }

  let properValue = getAsInfered(singleOptionPath)

  if (!properValue) return false

  if (properValue.desktop) {
    return properValue
  }

  return properValue.toString()
}

function tryToMatchValueWithOptionPath(
  maybeThat,
  singleOptionPath,
  inferedValuesForContext
) {
  let properValue = extractScalarValueFor(
    singleOptionPath,
    inferedValuesForContext
  )

  if (
    maybeThat &&
    maybeThat.toString() &&
    maybeThat.toString().indexOf('~') === 0
  ) {
    let toMatch = maybeThat.replace('~', '')

    if (properValue.desktop) {
      return (
        properValue.desktop === toMatch ||
        properValue.tablet === toMatch ||
        properValue.mobile === toMatch
      )
    }

    return properValue === toMatch
  }

  properValue = properValue.toString()
  maybeThat = maybeThat.toString()

  /**
   * The context value is not yet stabilized
   */
  if (!properValue) return false

  /**
   * Pipe operator
   */
  if (maybeThat.indexOf('|') > -1) {
    if (maybeThat.indexOf('!') === 0) {
      return (
        maybeThat
          .substring(1)
          .split('|')
          .map((el) => el.trim())
          .includes(properValue.trim()) === -1
      )
    } else {
      return (
        maybeThat
          .split('|')
          .map((el) => el.trim())
          .indexOf(properValue.trim()) > -1
      )
    }
  }

  /**
   * Negation operator
   */
  if (maybeThat.indexOf('!') === 0) {
    return properValue !== maybeThat.substring(1).trim()
  }

  /**
   * Contains operator
   */
  if (maybeThat.indexOf('*') === 0) {
    return (
      properValue.indexOf(
        maybeThat
          .trim()
          .substring(1)
          .trim()
      ) > -1
    )
  }

  /**
   * Simple equality
   */
  return properValue === maybeThat.trim()
}
