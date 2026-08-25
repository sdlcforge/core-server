import * as fs from 'node:fs/promises'

import { Item } from '@liquid-labs/resource-item'

import yaml from 'js-yaml'

const QuestionControl = class extends Item {
  constructor(data) {
    super(data, true)
  }

  static async loadData(file) {
    const contents = await fs.readFile(file, { encoding : 'utf8' })
    const data = yaml.load(contents)
    data.file = file
    data.type = 'QuestionControl'

    return data
  }

  async save() {
    const contents = yaml.dump(this.data)
    await fs.write(this.file, contents)
  }
}

Item.bindCreationConfig({
  itemClass    : QuestionControl,
  itemName     : 'question control',
  itemsName    : 'question controls',
  idNormalizer : (id, data) => data.name + '/' + data.source,
  keyField     : 'id'
})

export { QuestionControl }
