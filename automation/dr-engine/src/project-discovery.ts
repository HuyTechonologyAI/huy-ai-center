import { existsSync, readdirSync, statSync } from 'node:fs';
import { join, basename, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import type { DiscoveredProject } from './types.js';

const PROJECT_MARKERS = [
  '.git',
  'package.json',
  'package-lock.json',
  'pnpm-lock.yaml',
  'yarn.lock',
  'pyproject.toml',
  'requirements.txt',
  'Cargo.toml',
  'go.mod',
  'docker-compose.yml',
  'docker-compose.yaml',
  'supabase',
  'vercel.json',
  'README.md'
];

const EXCLUDED_PROFILE_SUBSTRINGS = [
  'appdata',
  'pictures',
  'videos',
  'music',
  'ntuser.dat',
  '.ssh',
  '.gnupg',
  'saved games',
  'searches',
  'contacts',
  'links',
  'onedrive'
];

export function isExcludedUserProfileArea(pathToCheck: string): boolean {
  const norm = pathToCheck.replace(/\\/g, '/').toLowerCase();
  for (const exc of EXCLUDED_PROFILE_SUBSTRINGS) {
    if (norm.includes(`/${exc}`) || norm.endsWith(`/${exc}`) || norm.includes(`\\${exc}`) || norm.includes(exc)) {
      return true;
    }
  }
  return false;
}

export function isProjectDirectory(dirPath: string): {
  isProject: boolean;
  markers: string[];
  isControlOrArtifactRoot: boolean;
  isAuthoritativeSource: boolean;
} {
  const norm = dirPath.replace(/\\/g, '/').toLowerCase();
  const isControlOrArtifact = norm.includes('data website/huy-ai-center') || norm.includes('directive');

  if (!existsSync(dirPath)) {
    return {
      isProject: false,
      markers: [],
      isControlOrArtifactRoot: isControlOrArtifact,
      isAuthoritativeSource: false
    };
  }

  const markers: string[] = [];
  try {
    for (const marker of PROJECT_MARKERS) {
      if (existsSync(join(dirPath, marker))) {
        markers.push(marker);
      }
    }
  } catch {
    // ignore
  }

  const isProject = markers.length > 0 || isControlOrArtifact;

  return {
    isProject,
    markers,
    isControlOrArtifactRoot: isControlOrArtifact,
    isAuthoritativeSource: isProject && !isControlOrArtifact
  };
}

export function getGitDetails(repoPath: string): {
  git_root: string | null;
  git_remote: string | null;
  current_branch: string | null;
  HEAD: string | null;
  dirty: boolean;
  staged: boolean;
  untracked_count: number;
} {
  if (!existsSync(join(repoPath, '.git'))) {
    return {
      git_root: null,
      git_remote: null,
      current_branch: null,
      HEAD: null,
      dirty: false,
      staged: false,
      untracked_count: 0
    };
  }

  const runGit = (...args: string[]) => {
    const res = spawnSync('git', args, { cwd: repoPath, encoding: 'utf8' });
    return res.status === 0 ? res.stdout.trim() : null;
  };

  const remote = runGit('remote', 'get-url', 'origin');
  const branch = runGit('branch', '--show-current');
  const head = runGit('rev-parse', 'HEAD');
  const status = runGit('status', '--porcelain') || '';

  const lines = status.split('\n').filter(Boolean);
  const untracked = lines.filter(l => l.startsWith('??')).length;
  const staged = lines.filter(l => /^[MADRC]/.test(l)).length > 0;
  const dirty = lines.length > 0;

  return {
    git_root: repoPath,
    git_remote: remote,
    current_branch: branch,
    HEAD: head,
    dirty,
    staged,
    untracked_count: untracked
  };
}

export function discoverProjects(options: {
  windowsRoot?: string;
  wslRepo?: string;
  directiveRoot?: string;
}): DiscoveredProject[] {
  const projects: DiscoveredProject[] = [];

  // 1. Authoritative WSL repo
  const wslRepoPath = options.wslRepo || '/home/huyai007/workspace/huy-ai-center';
  if (existsSync(wslRepoPath)) {
    const gitDetails = getGitDetails(wslRepoPath);
    projects.push({
      project_id: 'huy-ai-center-wsl',
      display_name: 'HUY AI Center Monorepo (WSL Authoritative)',
      source_path_windows: `\\\\wsl.localhost\\Ubuntu-24.04${wslRepoPath.replace(/\//g, '\\')}`,
      source_path_wsl: wslRepoPath,
      git_root: gitDetails.git_root,
      git_remote: gitDetails.git_remote,
      current_branch: gitDetails.current_branch,
      HEAD: gitDetails.HEAD,
      dirty: gitDetails.dirty,
      staged: gitDetails.staged,
      untracked_count: gitDetails.untracked_count,
      worktrees: [],
      submodules: [],
      size_bytes: 0,
      file_count: 0,
      project_markers: ['.git', 'package.json'],
      github_repo: 'HuyTechonologyAI/huy-ai-center',
      classification: 'PRIMARY_MONOREPO',
      migration_required: true,
      isControlOrArtifactRoot: false,
      isAuthoritativeSource: true
    });
  }

  // 2. Directive / Control / Artifact root
  const directiveRoot = options.directiveRoot || '/mnt/d/Data Website/huy-ai-center';
  if (existsSync(directiveRoot)) {
    const projCheck = isProjectDirectory(directiveRoot);
    projects.push({
      project_id: 'huy-ai-directive-control',
      display_name: 'HUY AI Directive & Control Root',
      source_path_windows: 'D:\\Data Website\\huy-ai-center',
      source_path_wsl: directiveRoot,
      git_root: null,
      git_remote: null,
      current_branch: null,
      HEAD: null,
      dirty: false,
      staged: false,
      untracked_count: 0,
      worktrees: [],
      submodules: [],
      size_bytes: 0,
      file_count: 0,
      project_markers: projCheck.markers,
      github_repo: null,
      classification: 'CONTROL_AND_ARTIFACT_ROOT',
      migration_required: false,
      isControlOrArtifactRoot: true,
      isAuthoritativeSource: false
    });
  }

  // 3. Project-aware discovery under Windows Root (e.g. C:\Users\Admin or /mnt/c/Users/Admin)
  const winRoot = options.windowsRoot || '/mnt/c/Users/Admin';
  if (existsSync(winRoot)) {
    try {
      const entries = readdirSync(winRoot, { withFileTypes: true });
      for (const ent of entries) {
        if (!ent.isDirectory()) continue;
        const fullPath = join(winRoot, ent.name);
        if (isExcludedUserProfileArea(fullPath)) continue;

        const check = isProjectDirectory(fullPath);
        if (check.isProject) {
          const gitDetails = getGitDetails(fullPath);
          projects.push({
            project_id: `win-${ent.name.toLowerCase()}`,
            display_name: ent.name,
            source_path_windows: `C:\\Users\\Admin\\${ent.name}`,
            source_path_wsl: fullPath,
            git_root: gitDetails.git_root,
            git_remote: gitDetails.git_remote,
            current_branch: gitDetails.current_branch,
            HEAD: gitDetails.HEAD,
            dirty: gitDetails.dirty,
            staged: gitDetails.staged,
            untracked_count: gitDetails.untracked_count,
            worktrees: [],
            submodules: [],
            size_bytes: 0,
            file_count: 0,
            project_markers: check.markers,
            github_repo: gitDetails.git_remote,
            classification: 'DISCOVERED_WINDOWS_PROJECT',
            migration_required: true,
            isControlOrArtifactRoot: check.isControlOrArtifactRoot,
            isAuthoritativeSource: check.isAuthoritativeSource
          });
        }
      }
    } catch {
      // non-fatal
    }
  }

  return projects;
}
