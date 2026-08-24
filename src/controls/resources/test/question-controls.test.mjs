/* global beforeAll describe expect test */
import * as fsPath from 'node:path'

import { QuestionControl } from '../question-control'

describe('QuestionControl', () => {
  describe('loadData', () => {
    const questionControlPath = fsPath.join(__dirname, 'data', 'orgRootA', 'data', 'org', 'controls', 'test-controls.qcontrols.yaml')
    let questionControl
    beforeAll(async() => {
      questionControl = await QuestionControl.loadData(questionControlPath)
    })

    test('loads data from a file', () => expect(questionControl).toBeTruthy())

    test('sets the source file', () => expect(questionControl.file).toBe(questionControlPath))
  })
})
