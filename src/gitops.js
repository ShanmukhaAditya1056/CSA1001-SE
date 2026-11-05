// DevTrack Enterprise GitOps & Version Control Automation Engine
import { store } from './store.js';
import { teamCollab } from './collab.js';
import { showToast, escapeHtml } from './ui.js';

/**
 * Generate standard Git branch name from task key and title
 * e.g. feat/MULE-101-implement-altimeter-driver
 */
export function generateBranchName(projectKey, taskKey, taskTitle) {
  const cleanTitle = (taskTitle || 'work-item')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 32);
  const prefix = (taskKey || 'TASK').toLowerCase();
  return `feat/${prefix}-${cleanTitle}`;
}

/**
 * Record a Git commit for a task and perform automated lifecycle state transition
 */
export function recordGitCommit(taskId, { message, author, branch = null, autoTransition = true }) {
  const task = store.getTask(taskId);
  if (!task) return { error: 'Task not found' };

  const project = store.getActiveProject();
  const currentUser = store.currentUser;
  const commitAuthor = author || currentUser?.name || 'Developer';
  const sha = Math.random().toString(16).slice(2, 9);
  const timestamp = new Date().toISOString();

  const newCommit = {
    sha,
    message: message.trim(),
    author: commitAuthor,
    timestamp
  };

  const existingCommits = Array.isArray(task.gitCommits) ? task.gitCommits : [];
  const updatedCommits = [newCommit, ...existingCommits];
  const targetBranch = branch || task.gitBranch || (project ? generateBranchName(project.key, task.id, task.title) : 'main');

  const updates = {
    gitBranch: targetBranch,
    gitCommits: updatedCommits
  };

  let transitionMsg = '';
  const lowerMsg = message.toLowerCase();

  if (autoTransition) {
    if ((lowerMsg.includes('merge') || lowerMsg.includes('closes') || lowerMsg.includes('fixes')) && task.status !== 'Done') {
      // Transition to Done
      updates.status = 'Done';
      if (task.pullRequest) {
        updates.pullRequest = { ...task.pullRequest, status: 'merged' };
      }
      transitionMsg = 'Task auto-promoted to Done (Merged)';
    } else if ((lowerMsg.includes('pr') || lowerMsg.includes('review') || lowerMsg.includes('pull request')) && task.status !== 'In Review' && task.status !== 'Done') {
      // Transition to In Review
      updates.status = 'In Review';
      updates.pullRequest = task.pullRequest || {
        id: Math.floor(10 + Math.random() * 90),
        title: task.title,
        status: 'open',
        ciStatus: 'passing',
        approvals: 1
      };
      transitionMsg = 'Task auto-promoted to In Review (PR Opened)';
    } else if (task.status === 'To Do' || task.status === 'Backlog') {
      // First commit on To Do -> In Progress
      updates.status = 'In Progress';
      if (!task.assigneeId && currentUser) {
        updates.assigneeId = currentUser.id;
      }
      transitionMsg = 'Task auto-promoted to In Progress (Branch Active)';
    }
  }

  const res = store.updateTask(taskId, updates);
  if (res.error) return res;

  // Broadcast GitOps event
  teamCollab.broadcastAction({
    action: 'GITOPS_COMMIT',
    title: `Git Commit [${sha}]`,
    details: `${commitAuthor}: "${message}" ${transitionMsg ? `→ ${transitionMsg}` : ''}`
  });

  return { data: res.data, commit: newCommit, transitionMsg };
}

/**
 * Simulate Pull Request creation or status change
 */
export function updatePullRequest(taskId, prAction) {
  const task = store.getTask(taskId);
  if (!task) return { error: 'Task not found' };

  const prId = task.pullRequest?.id || Math.floor(10 + Math.random() * 90);
  let prStatus = 'open';
  let targetStatus = task.status;

  if (prAction === 'create' || prAction === 'open') {
    prStatus = 'open';
    if (task.status === 'To Do' || task.status === 'In Progress') {
      targetStatus = 'In Review';
    }
  } else if (prAction === 'merge') {
    prStatus = 'merged';
    targetStatus = 'Done';
  } else if (prAction === 'close') {
    prStatus = 'closed';
  }

  const updatedPR = {
    id: prId,
    title: task.title,
    status: prStatus,
    ciStatus: 'passing',
    approvals: prStatus === 'merged' ? 2 : 1,
    updatedAt: new Date().toISOString()
  };

  const res = store.updateTask(taskId, {
    pullRequest: updatedPR,
    status: targetStatus
  });

  if (!res.error) {
    teamCollab.broadcastAction({
      action: 'GITOPS_PR',
      title: `Pull Request #${prId} ${prStatus.toUpperCase()}`,
      details: `${task.title} (Status: ${targetStatus})`
    });
  }

  return res;
}

