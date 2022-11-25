#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import os from 'os';
import dns from 'dns';
import url from 'url';
import { execSync } from 'child_process';

import prompts from 'prompts';
import chalk from 'chalk';
import validateProjectName from 'validate-npm-package-name';
import { Command } from 'commander';
import spawn from 'cross-spawn';
import checkForUpdate from 'update-check';
import cpy from 'cpy';
import rimraf from 'rimraf';

import packageJson from './package.json';

let projectPath = '';
/**
 * command
 */
const program = new Command();
program
  .name(packageJson.name)
  .description(`CLI to create ${packageJson.description} project`)
  .version(packageJson.version);

program.argument('<project-directory>').action((dirName) => (projectPath = dirName));

/**
 * main
 */
async function run(): Promise<void> {
  const resolvedProjectPath = await resolveProjectPath();
  checkProjectName(resolvedProjectPath);
  await checkProjectFoleder(resolvedProjectPath);
  await createApp(resolvedProjectPath);
}

async function resolveProjectPath(): Promise<string> {
  if (typeof projectPath === 'string') {
    projectPath = projectPath.trim();
  }

  if (!projectPath) {
    const res = await prompts({
      type: 'text',
      name: 'path',
      message: 'What is your project named?',
      initial: 'my-app',
      validate: (name) => {
        const validation = validateNpmName(path.basename(path.resolve(name)));
        if (validation.valid) {
          return true;
        }
        return 'Invalid project name: ' + validation.problems![0];
      },
    });

    if (typeof res.path === 'string') {
      projectPath = res.path.trim();
    }
  }

  if (!projectPath) {
    console.log(
      '\nPlease specify the project directory:\n' +
        `  ${chalk.cyan(program.name())} ${chalk.green('<project-directory>')}\n` +
        'For example:\n' +
        `  ${chalk.cyan(program.name())} ${chalk.green('my-next-app')}\n\n` +
        `Run ${chalk.cyan(`${program.name()} --help`)} to see all options.`
    );
    process.exit(1);
  }

  const resolvedProjectPath = path.resolve(projectPath);
  return resolvedProjectPath;
}

function checkProjectName(resolvedProjectPath: string) {
  const projectName = path.basename(resolvedProjectPath);

  const { valid, problems } = validateNpmName(projectName);
  if (!valid) {
    console.error(
      `Could not create a project called ${chalk.red(
        `"${projectName}"`
      )} because of npm naming restrictions:`
    );

    problems!.forEach((p) => console.error(`    ${chalk.red.bold('*')} ${p}`));
    process.exit(1);
  }
}

async function checkProjectFoleder(resolvedProjectPath: string) {
  if (!(await isWriteable(path.dirname(resolvedProjectPath)))) {
    console.error(
      'The application path is not writable, please check folder permissions and try again.'
    );
    console.error('It is likely you do not have write permissions for this folder.');
    process.exit(1);
  }
}

async function createApp(root: string) {
  const appName = path.basename(root);

  await makeDir(root);
  if (!isFolderEmpty(root, appName)) {
    process.exit(1);
  }
  const originalDirectory = process.cwd();

  process.chdir(root);

  writePackageJson(root, appName);
  await installDep(root);
  await copyTemplate(root);

  if (tryGitInit(root)) {
    console.log('Initialized a git repository.');
    console.log();
  }

  consoleDesc(root, originalDirectory, appName);
}

function writePackageJson(root: string, appName: string) {
  /**
   * Create a package.json for the new project.
   */
  const json = {
    name: appName,
    version: '0.1.0',
    private: true,
    scripts: {
      dev: 'next dev',
      build: 'next build',
      start: 'next start',
      lint: 'next lint',
    },
  };

  /**
   * Write it to disk.
   */
  fs.writeFileSync(path.join(root, 'package.json'), JSON.stringify(json, null, 2) + os.EOL);
}

async function installDep(root: string) {
  const packageManager = getPkgManager();
  console.log(chalk.bold(`Using ${packageManager}.`));

  const useYarn = packageManager === 'yarn';
  const isOnline = !useYarn || (await getOnline());
  /**
   * These flags will be passed to `install()`.
   */
  const installFlags = { packageManager, isOnline };
  /**
   * Default dependencies.
   */
  const dependencies = ['react', 'react-dom', 'next', 'ethers', 'wagmi'];
  /**
   * Default devDependencies.
   */
  const devDependencies = [
    '@types/react',
    '@types/node',
    '@types/react-dom',
    'eslint',
    'eslint-config-next',
    'typescript',
    'prettier',
    '@trivago/prettier-plugin-sort-imports',
  ];

  /**
   * Install package.json dependencies if they exist.
   */
  if (dependencies.length) {
    console.log();
    console.log('Installing dependencies:');
    for (const dependency of dependencies) {
      console.log(`- ${chalk.cyan(dependency)}`);
    }
    console.log();

    await install(root, dependencies, installFlags);
  }
  /**
   * Install package.json devDependencies if they exist.
   */
  if (devDependencies.length) {
    console.log();
    console.log('Installing devDependencies:');
    for (const devDependency of devDependencies) {
      console.log(`- ${chalk.cyan(devDependency)}`);
    }
    console.log();

    const devInstallFlags = { devDependencies: true, ...installFlags };
    await install(root, devDependencies, devInstallFlags);
  }
  console.log();
}

async function copyTemplate(root: string) {
  /**
   * Copy the template files to the target directory.
   */
  await cpy('**', root, {
    parents: true,
    cwd: path.join(__dirname, 'template'),
    rename: (name) => {
      switch (name) {
        case 'gitignore':
        case 'eslintrc.json':
        case 'prettierrc': {
          return '.'.concat(name);
        }
        // README.md is ignored by webpack-asset-relocator-loader used by ncc:
        // https://github.com/vercel/webpack-asset-relocator-loader/blob/e9308683d47ff507253e37c9bcbb99474603192b/src/asset-relocator.js#L227
        case 'README-template.md': {
          return 'README.md';
        }
        default: {
          return name;
        }
      }
    },
  });
}

function consoleDesc(root: string, originalDirectory: string, appName: string) {
  const packageJsonPath = path.join(root, 'package.json');

  let cdpath: string;
  if (path.join(originalDirectory, appName) === root) {
    cdpath = appName;
  } else {
    cdpath = root;
  }

  console.log(`${chalk.green('Success!')} Created ${appName} at ${root}`);

  const packageManager = getPkgManager();
  console.log(chalk.bold(`Using ${packageManager}.`));

  const useYarn = packageManager === 'yarn';
  const hasPackageJson = fs.existsSync(packageJsonPath);
  if (hasPackageJson) {
    console.log('Inside that directory, you can run several commands:');
    console.log();
    console.log(chalk.cyan(`  ${packageManager} ${useYarn ? '' : 'run '}dev`));
    console.log('    Starts the development server.');
    console.log();
    console.log(chalk.cyan(`  ${packageManager} ${useYarn ? '' : 'run '}build`));
    console.log('    Builds the app for production.');
    console.log();
    console.log(chalk.cyan(`  ${packageManager} start`));
    console.log('    Runs the built app in production mode.');
    console.log();
    console.log('We suggest that you begin by typing:');
    console.log();
    console.log(chalk.cyan('  cd'), cdpath);
    console.log(`  ${chalk.cyan(`${packageManager} ${useYarn ? '' : 'run '}dev`)}`);
  }
  console.log();
}

/**
 * helpers
 */
function validateNpmName(name: string): {
  valid: boolean;
  problems?: string[];
} {
  const nameValidation = validateProjectName(name);
  if (nameValidation.validForNewPackages) {
    return { valid: true };
  }

  return {
    valid: false,
    problems: [...(nameValidation.errors || []), ...(nameValidation.warnings || [])],
  };
}

type PackageManager = 'npm' | 'pnpm' | 'yarn';
function getPkgManager(): PackageManager {
  try {
    const userAgent = process.env.npm_config_user_agent;
    if (userAgent) {
      if (userAgent.startsWith('yarn')) {
        return 'yarn';
      } else if (userAgent.startsWith('pnpm')) {
        return 'pnpm';
      }
    }
    try {
      execSync('yarn --version', { stdio: 'ignore' });
      return 'yarn';
    } catch {
      execSync('pnpm --version', { stdio: 'ignore' });
      return 'pnpm';
    }
  } catch {
    return 'npm';
  }
}

export function makeDir(root: string, options = { recursive: true }): Promise<string | undefined> {
  return fs.promises.mkdir(root, options);
}

function isFolderEmpty(root: string, name: string): boolean {
  const validFiles = [
    '.DS_Store',
    '.git',
    '.gitattributes',
    '.gitignore',
    '.gitlab-ci.yml',
    '.hg',
    '.hgcheck',
    '.hgignore',
    '.idea',
    '.npmignore',
    '.travis.yml',
    'LICENSE',
    'Thumbs.db',
    'docs',
    'mkdocs.yml',
    'npm-debug.log',
    'yarn-debug.log',
    'yarn-error.log',
    'yarnrc.yml',
    '.yarn',
  ];

  const conflicts = fs
    .readdirSync(root)
    .filter((file) => !validFiles.includes(file))
    // Support IntelliJ IDEA-based editors
    .filter((file) => !/\.iml$/.test(file));

  if (conflicts.length > 0) {
    console.log(`The directory ${chalk.green(name)} contains files that could conflict:`);
    console.log();
    for (const file of conflicts) {
      try {
        const stats = fs.lstatSync(path.join(root, file));
        if (stats.isDirectory()) {
          console.log(`  ${chalk.blue(file)}/`);
        } else {
          console.log(`  ${file}`);
        }
      } catch {
        console.log(`  ${file}`);
      }
    }
    console.log();
    console.log('Either try using a new directory name, or remove the files listed above.');
    console.log();
    return false;
  }

  return true;
}

function getOnline(): Promise<boolean> {
  return new Promise((resolve) => {
    dns.lookup('registry.yarnpkg.com', (registryErr) => {
      if (!registryErr) {
        return resolve(true);
      }

      const proxy = getProxy();
      if (!proxy) {
        return resolve(false);
      }

      const { hostname } = url.parse(proxy);
      if (!hostname) {
        return resolve(false);
      }

      dns.lookup(hostname, (proxyErr) => {
        resolve(proxyErr == null);
      });
    });
  });
}

function getProxy(): string | undefined {
  if (process.env.https_proxy) {
    return process.env.https_proxy;
  }

  try {
    const httpsProxy = execSync('npm config get https-proxy').toString().trim();
    return httpsProxy !== 'null' ? httpsProxy : undefined;
  } catch (e) {
    return;
  }
}

async function isWriteable(directory: string): Promise<boolean> {
  try {
    await fs.promises.access(directory, (fs.constants || fs).W_OK);
    return true;
  } catch (err) {
    return false;
  }
}

interface InstallArgs {
  /**
   * Indicate whether to install packages using npm, pnpm or Yarn.
   */
  packageManager: PackageManager;
  /**
   * Indicate whether there is an active Internet connection.
   */
  isOnline: boolean;
  /**
   * Indicate whether the given dependencies are devDependencies.
   */
  devDependencies?: boolean;
}

/**
 * Spawn a package manager installation with either Yarn or NPM.
 *
 * @returns A Promise that resolves once the installation is finished.
 */
function install(
  root: string,
  dependencies: string[] | null,
  { packageManager, isOnline, devDependencies }: InstallArgs
): Promise<void> {
  return new Promise((resolve, reject) => {
    let args: string[];
    let command = packageManager;
    const useYarn = packageManager === 'yarn';

    if (dependencies && dependencies.length) {
      /**
       * If there are dependencies, run a variation of `{packageManager} add`.
       */
      if (useYarn) {
        /**
         * Call `yarn add --exact (--offline)? (-D)? ...`.
         */
        args = ['add', '--exact'];
        if (!isOnline) args.push('--offline');
        args.push('--cwd', root);
        if (devDependencies) args.push('--dev');
        args.push(...dependencies);
      } else {
        /**
         * Call `(p)npm install [--save|--save-dev] ...`.
         */
        args = ['install', '--save-exact'];
        args.push(devDependencies ? '--save-dev' : '--save');
        args.push(...dependencies);
      }
    } else {
      /**
       * If there are no dependencies, run a variation of `{packageManager}
       * install`.
       */
      args = ['install'];
      if (!isOnline) {
        console.log(chalk.yellow('You appear to be offline.'));
        if (useYarn) {
          console.log(chalk.yellow('Falling back to the local Yarn cache.'));
          console.log();
          args.push('--offline');
        } else {
          console.log();
        }
      }
    }
    /**
     * Spawn the installation process.
     */
    const child = spawn(command, args, {
      stdio: 'inherit',
      env: {
        ...process.env,
        ADBLOCK: '1',
        // we set NODE_ENV to development as pnpm skips dev
        // dependencies when production
        NODE_ENV: 'development',
        DISABLE_OPENCOLLECTIVE: '1',
      },
    });
    child.on('close', (code) => {
      if (code !== 0) {
        reject({ command: `${command} ${args.join(' ')}` });
        return;
      }
      resolve();
    });
  });
}

const update = checkForUpdate(packageJson).catch(() => null);

async function notifyUpdate(): Promise<void> {
  try {
    const res = await update;
    if (res?.latest) {
      const pkgManager = getPkgManager();
      console.log(
        chalk.yellow.bold('A new version of `create-next-web3` is available!') +
          '\n' +
          'You can update by running: ' +
          chalk.cyan(
            pkgManager === 'yarn'
              ? 'yarn global add create-next-web3'
              : `${pkgManager} install --global create-next-web3`
          ) +
          '\n'
      );
    }
    process.exit();
  } catch {
    // ignore error
  }
}

function tryGitInit(root: string): boolean {
  let didInit = false;
  try {
    execSync('git --version', { stdio: 'ignore' });
    if (isInGitRepository() || isInMercurialRepository()) {
      return false;
    }

    execSync('git init', { stdio: 'ignore' });
    didInit = true;

    execSync('git checkout -b main', { stdio: 'ignore' });

    execSync('git add -A', { stdio: 'ignore' });
    execSync('git commit -m "Initial commit from Create Next Web3"', {
      stdio: 'ignore',
    });
    return true;
  } catch (e) {
    if (didInit) {
      try {
        rimraf.sync(path.join(root, '.git'));
      } catch (_) {}
    }
    return false;
  }
}
function isInGitRepository(): boolean {
  try {
    execSync('git rev-parse --is-inside-work-tree', { stdio: 'ignore' });
    return true;
  } catch (_) {}
  return false;
}

function isInMercurialRepository(): boolean {
  try {
    execSync('hg --cwd . root', { stdio: 'ignore' });
    return true;
  } catch (_) {}
  return false;
}

run()
  .then(notifyUpdate)
  .catch(async (reason) => {
    console.log();
    console.log('Aborting installation.');
    if (reason.command) {
      console.log(`  ${chalk.cyan(reason.command)} has failed.`);
    } else {
      console.log(chalk.red('Unexpected error. Please report it as a bug:') + '\n', reason);
    }
    console.log();

    await notifyUpdate();

    process.exit(1);
  });
