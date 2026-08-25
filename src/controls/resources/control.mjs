import { Item } from '@liquid-labs/resource-item'

import { QuestionControl } from './question-control'

const Control = class extends Item {
  constructor(data, noRecurse) {
    super(data)

    if (noRecurse !== true) {
      const { type } = data
      if (type === 'QuestionControl') {
        return new QuestionControl(data)
      }
      else {
        throw new Error('Unknown control type: ' + type)
      }
    }
  }
}

Item.bindCreationConfig({
  itemClass    : Control,
  itemName     : 'control',
  itemsName    : 'controls',
  idNormalizer : (id, data) => {
    if (data.type === 'QuestionControl') {
      return QuestionControl.itemConfig.idNormalizer(id, data)
    }
  },
  keyField : 'id'
})

export { Control }
