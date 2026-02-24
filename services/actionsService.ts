import { Octokit } from '@octokit/rest'
import type { GitHubConfig } from '@/types'

export type WorkflowRunStatus = 'queued' | 'in_progress' | 'completed'
export type WorkflowRunConclusion =
  | 'success'
  | 'failure'
  | 'cancelled'
  | 'skipped'
  | 'timed_out'
  | 'action_required'
  | null

export interface WorkflowRun {
  id: number
  name: string | null
  status: WorkflowRunStatus
  conclusion: WorkflowRunConclusion
  createdAt: string
  updatedAt: string
  /** URL to the Actions run detail page on GitHub */
  htmlUrl: string
  /** Short commit message that triggered this run */
  headCommitMessage: string | null
}

export class ActionsService {
  private octokit: Octokit
  private config: GitHubConfig

  constructor(config: GitHubConfig) {
    this.config = config
    this.octokit = new Octokit({ auth: config.token })
  }

  async getRecentRuns(perPage = 5, page = 1): Promise<{ runs: WorkflowRun[]; total: number }> {
    try {
      const { data } = await this.octokit.rest.actions.listWorkflowRunsForRepo({
        owner: this.config.owner,
        repo: this.config.repo,
        per_page: perPage,
        page,
      })

      const runs = data.workflow_runs.map((run) => ({
        id: run.id,
        name: run.name ?? null,
        status: run.status as WorkflowRunStatus,
        conclusion: (run.conclusion as WorkflowRunConclusion) ?? null,
        createdAt: run.created_at,
        updatedAt: run.updated_at,
        htmlUrl: run.html_url,
        headCommitMessage: run.head_commit?.message?.split('\n')[0] ?? null,
      }))

      return { runs, total: data.total_count }
    } catch {
      return { runs: [], total: 0 }
    }
  }

  async getLatestRun(): Promise<WorkflowRun | null> {
    const { runs } = await this.getRecentRuns(1)
    return runs[0] ?? null
  }
}

// ─── Singleton ────────────────────────────────────────────────────────────────

let _actionsService: ActionsService | null = null

export function createActionsService(config: GitHubConfig): ActionsService {
  _actionsService = new ActionsService(config)
  return _actionsService
}

export function getActionsService(): ActionsService | null {
  return _actionsService
}

export function resetActionsService(): void {
  _actionsService = null
}
