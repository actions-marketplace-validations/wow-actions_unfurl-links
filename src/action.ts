import * as core from '@actions/core'
import * as github from '@actions/github'
import { Util } from './util'
import { Unfurl } from './unfurl'

export namespace Action {
  export async function run() {
    try {
      if (
        Util.isValidEvent('pull_request', 'opened') ||
        Util.isValidEvent('pull_request', 'edited') ||
        Util.isValidEvent('issues', 'opened') ||
        Util.isValidEvent('issues', 'edited') ||
        Util.isValidEvent('issue_comment', 'created') ||
        Util.isValidEvent('issue_comment', 'edited')
      ) {
        const { context } = github
        const headers = { accept: 'application/vnd.github.full+json' }

        if (context.payload.comment) {
          const octokit = Util.getOctokit()
          const comment = await octokit.rest.issues.getComment({
            ...context.repo,
            headers,
            comment_id: context.payload.comment.id,
          })
          // core.debug(JSON.stringify(comment.data, null, 2))
          const html = Util.getHtml(comment.data)
          const body = await Unfurl.parse(html)
          if (body) {
            await octokit.rest.issues.updateComment({
              ...context.repo,
              body,
              comment_id: context.payload.comment.id,
            })
          }
        } else {
          const payload = context.payload.pull_request || context.payload.issue
          if (payload) {
            if (context.payload.pull_request) {
              if (payload.draft) {
                core.debug('Ignore draft PR')
                return
              }
            }

            const octokit = Util.getOctokit()
            const issue = await octokit.rest.issues.get({
              ...context.repo,
              headers,
              issue_number: payload.number,
            })

            const html = Util.getHtml(issue.data)
            const body = await Unfurl.parse(html)
            if (body) {
              await octokit.rest.issues.update({
                ...context.repo,
                body,
                issue_number: payload.number,
              })
            }
          }
        }
      }
    } catch (e) {
      core.error(e)
      core.setFailed(e.message)
    }
  }
}
