import * as orgCreate from './create'
import * as orgList from './list'
import * as paramDetail from './parameters-detail'
import * as paramList from './parameters-list'
import * as paramSet from './parameters-set'

const handlers = [
  orgCreate,
  orgList,
  paramDetail,
  paramList,
  paramSet
]

export { handlers }
