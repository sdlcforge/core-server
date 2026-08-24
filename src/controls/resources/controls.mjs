import { find } from '@liquid-labs/find-plus'
import { ItemManager } from '@liquid-labs/resource-model'

import { Control } from './control'
import { QuestionControl } from './question-control'

const Controls = class extends ItemManager {
  constructor({
    items = [],
    reporter
  }) {
    super({ items, reporter })
  }

  static async load(controlsDir, reporter) {
    const items = []

    const questionControlFiles =
      await find({ root : controlsDir, tests : [({ name }) => name.endsWith('.qcontrols.yaml')] })

    const questionControlItems = await Promise.all(questionControlFiles.map(async(f) => {
      const questionControl = await QuestionControl.loadData(f)
      return questionControl
    }))

    items.push(...questionControlItems)

    return new Controls({ items, reporter })
  }

  getControl(controlType) {
    const candidates = this.list({ rawData : true, sort : false }).filter(({ id }) => id.startsWith(controlType + '/'))
    if (candidates.length > 1) {
      throw new Error(`Multiple controls for '${controlType}' found; bailing out.`)
    }

    return candidates[0]
  }
}

Object.defineProperty(Controls, 'itemConfig', {
  value        : Control.itemConfig,
  writable     : false,
  enumerable   : true,
  configurable : false
})

export { Controls }
