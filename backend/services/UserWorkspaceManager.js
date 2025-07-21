import fs from 'fs';
import path from 'path';

export class UserWorkspaceManager {
  static baseDir = path.resolve(process.cwd(), 'workspaces'); // project-relative

  static getUserWorkspacePath(userId) {
    // Ensure the base directory exists
    if (!fs.existsSync(UserWorkspaceManager.baseDir)) {
      fs.mkdirSync(UserWorkspaceManager.baseDir, { recursive: true });
    }
    const userDir = path.join(UserWorkspaceManager.baseDir, userId);
    if (!fs.existsSync(userDir)) {
      fs.mkdirSync(userDir, { recursive: true });
    }
    return userDir;
  }
}
