import * as auditFixHandler from './audit-fix'
import * as auditFixImpliedHandler from './audit-fix-implied'
import * as auditHandler from './audit'
import * as auditImpliedHandler from './audit-implied'

const handlers = [auditFixHandler, auditFixImpliedHandler, auditHandler, auditImpliedHandler]

export { handlers }
