import { spawn, execFile } from 'node:child_process';
import { access, realpath } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { setTimeout as delay } from 'node:timers/promises';
import { createServer } from 'node:net';

const exec = promisify(execFile);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export function normalizePath(value) {
  const normalized = path.normalize(value);
  return process.platform === 'win32' ? normalized.toLowerCase() : normalized;
}

export async function checkOwner(container, directory) {
  const labels = container.Config?.Labels ?? {};
  const files = (labels['com.docker.compose.project.config_files'] ?? '').split(',');
  const expected = normalizePath(await realpath(path.join(directory, 'compose.yaml')));
  if (labels['com.docker.compose.service'] !== 'postgres' || files.length !== 1 || !files[0]) {
    throw new Error('No es pot confirmar la propietat del contenidor PostgreSQL.');
  }
  // realpath també resol enllaços; la comparació Windows ignora majúscules.
  let actual;
  try {
    actual = normalizePath(await realpath(files[0]));
  } catch {
    throw new Error('El compose.yaml de les etiquetes Docker no és accessible. No es modifica el contenidor.');
  }
  if (actual !== expected) {
    throw new Error('PostgreSQL pertany a un altre checkout. Executa el launcher des del checkout propietari.');
  }
}

// directory és explícit per poder verificar el launcher contra un checkout existent.
export async function launch(directory = root) {
  const composeFile = path.join(directory, 'compose.yaml');
  const composeArgs = ['compose', '--project-directory', directory, '-f', composeFile];
  const children = [];
  let stopping = false;
  const cancellation = new Error('Arrencada cancel·lada.');
  let exitCode = 0;
  let startedContainer;
  let startupComplete = false;
  let postgresMonitor;
  let finish;
  const stopped = new Promise((resolve) => { finish = resolve; });

  function requestStop(code = 0, message) {
    if (message) console.error(`[Nestly] ${message}`);
    exitCode = Math.max(exitCode, code);
    stopping = true;
    if (startupComplete) finish();
  }
  const onSignal = () => {
    if (!stopping && !startupComplete) console.log('[Nestly] Arrencada cancel·lada.');
    requestStop(0);
  };
  process.on('SIGINT', onSignal);
  process.on('SIGTERM', onSignal);

  async function docker(args) {
    const { stdout } = await exec('docker', args, {
      cwd: directory, windowsHide: true, timeout: 90_000, maxBuffer: 1024 * 1024,
    });
    return stdout.trim();
  }
  async function inspect(id) {
    return JSON.parse(await docker(['inspect', id]))[0];
  }
  async function containerId() {
    const ids = (await docker([...composeArgs, 'ps', '--all', '--quiet', 'postgres'])).split(/\s+/).filter(Boolean);
    if (ids.length > 1) throw new Error('Hi ha múltiples contenidors postgres. Cal revisar el conflicte manualment.');
    return ids[0];
  }
  function ensureContinuing() {
    if (stopping) throw cancellation;
  }
  function startApp(name, folder) {
    ensureContinuing();
    // npm_execpath apunta al CLI JS: evita wrappers .cmd i problemes de quoting.
    const child = spawn(process.execPath, [process.env.npm_execpath, 'run', 'dev'], {
      cwd: path.join(directory, folder), stdio: ['ignore', 'pipe', 'pipe'],
      detached: true, windowsHide: true,
    });
    children.push({ name, child });
    child.stdout.pipe(process.stdout);
    child.stderr.pipe(process.stderr);
    child.on('error', () => requestStop(1, `No s’ha pogut iniciar ${name}.`));
    child.on('exit', (code, signal) => {
      if (!stopping) requestStop(1, `${name} ha finalitzat inesperadament (codi ${code}, senyal ${signal ?? 'cap'}).`);
    });
  }

  try {
    if (Number(process.versions.node.split('.')[0]) !== 24) throw new Error('Cal Node.js 24.');
    if (!process.env.npm_execpath) throw new Error('Executa npm run dev des de l’arrel del checkout.');
    for (const file of ['compose.yaml', '.env', 'backend/node_modules/tsx/package.json', 'frontend/node_modules/vite/package.json']) {
      ensureContinuing();
      try { await access(path.join(directory, file)); }
      catch { throw new Error(`Falta ${file}. Prepara la configuració i les dependències del checkout abans d’arrencar.`); }
    }
    for (const folder of ['backend', 'frontend']) {
      ensureContinuing();
      try {
        await exec(process.execPath, [process.env.npm_execpath, 'ls', '--depth=0'], {
          cwd: path.join(directory, folder), windowsHide: true, timeout: 15_000,
        });
      } catch {
        throw new Error(`Dependències incompletes o incompatibles a ${folder}/. Executa npm ci en aquest directori abans d’arrencar.`);
      }
    }
    ensureContinuing();
    try { await docker(['info', '--format', '{{.ServerVersion}}']); }
    catch { throw new Error('Docker no està disponible. Comprova Docker Desktop i els permisos.'); }
    ensureContinuing();
    try { await docker([...composeArgs, 'config', '--quiet']); }
    catch { throw new Error('Configuració Compose invàlida. Revisa compose.yaml i les variables obligatòries del .env.'); }
    for (const port of [3000, 5173]) {
      ensureContinuing();
      await new Promise((resolve, reject) => {
        const server = createServer();
        server.once('error', () => reject(new Error(`El port ${port} no està disponible. Comprova si Nestly ja està iniciat; no s’atura cap procés aliè.`)));
        server.listen(port, '127.0.0.1', () => server.close(resolve));
      });
    }
    ensureContinuing();
    let id = await containerId();
    ensureContinuing();
    if (!id) {
      await docker([...composeArgs, 'create', '--no-recreate', 'postgres']);
      id = await containerId();
      if (!id) throw new Error('Compose no ha creat el contenidor postgres.');
    }
    const initial = await inspect(id);
    await checkOwner(initial, directory);
    if (initial.State.Paused || initial.State.Restarting) throw new Error('PostgreSQL està pausat o reiniciant-se. Revisa’l abans d’arrencar.');
    ensureContinuing();
    if (!initial.State.Running) {
      // Registre abans de start; sense startedAt no es pot aturar amb seguretat.
      startedContainer = { id: initial.Id };
      await docker([...composeArgs, 'start', 'postgres']);
      const started = await inspect(initial.Id);
      await checkOwner(started, directory);
      startedContainer.startedAt = started.State.StartedAt;
    } else {
      console.log('[Nestly] PostgreSQL ja estava funcionant; es deixarà actiu en sortir.');
    }
    const deadline = Date.now() + 90_000;
    while (true) {
      ensureContinuing();
      const current = await inspect(initial.Id);
      await checkOwner(current, directory);
      if (!current.State.Running) throw new Error('PostgreSQL s’ha aturat durant l’arrencada.');
      if (!current.State.Health) throw new Error('PostgreSQL no té healthcheck.');
      if (current.State.Health.Status === 'healthy') break;
      if (current.State.Health.Status === 'unhealthy' || Date.now() >= deadline) throw new Error('PostgreSQL no arriba a healthy dins del termini d’arrencada.');
      await delay(500);
    }
    console.log('[Nestly] PostgreSQL healthy. Iniciant Express i Vite; Ctrl+C per aturar.');
    startApp('Express', 'backend');
    startApp('Vite', 'frontend');
    startupComplete = true;
    let inspecting = false;
    postgresMonitor = setInterval(async () => {
      if (stopping || inspecting) return;
      inspecting = true;
      try {
        const current = await inspect(initial.Id);
        await checkOwner(current, directory);
        if (!current.State.Running || current.State.Health?.Status !== 'healthy') {
          requestStop(1, 'PostgreSQL ha deixat d’estar healthy.');
        }
      } catch {
        if (!stopping) requestStop(1, 'S’ha perdut la supervisió de PostgreSQL.');
      } finally {
        inspecting = false;
      }
    }, 2_000);
    if (stopping) finish();
    await stopped;
  } catch (error) {
    if (error !== cancellation) requestStop(1, error.message);
  } finally {
    stopping = true;
    clearInterval(postgresMonitor);
    console.log('[Nestly] Aturant els processos iniciats...');
    for (const { name, child } of children) {
      if (!child.pid) continue;
      if (child.exitCode !== null || child.signalCode !== null) {
        console.warn(`[Nestly] El pare de ${name} ja ha finalitzat; no s’actua sobre el PID ${child.pid}. Poden quedar descendents orfes: revisa manualment els processos propis.`);
        continue;
      }
      try {
        if (process.platform === 'win32') {
          await exec('taskkill.exe', ['/PID', String(child.pid), '/T', '/F'], { windowsHide: true, timeout: 10_000 });
        } else {
          process.kill(-child.pid, 'SIGTERM');
        }
      } catch {
        if (child.exitCode !== null || child.signalCode !== null) {
          console.warn(`[Nestly] El pare de ${name} ha desaparegut durant el cleanup. Poden quedar descendents orfes: revisa manualment els processos propis.`);
          continue;
        }
        console.error(`[Nestly] No s’ha pogut completar el cleanup de ${name}. Comprova si queden processos propis actius.`);
        exitCode = 1;
      }
    }
    if (startedContainer) {
      try {
        const current = await inspect(startedContainer.id);
        await checkOwner(current, directory);
        if (current.State.Running && !startedContainer.startedAt) {
          throw new Error(`No s’ha pogut confirmar l’instant d’arrencada del contenidor ${startedContainer.id}; es deixa actiu. Cal revisar-lo manualment.`);
        }
        if (current.Id !== startedContainer.id || (startedContainer.startedAt && current.State.StartedAt !== startedContainer.startedAt)) {
          throw new Error('El contenidor ha canviat o s’ha reiniciat externament; no s’atura.');
        }
        if (current.State.Running) await docker(['stop', '--time', '10', current.Id]);
        console.log('[Nestly] PostgreSQL iniciat pel launcher, aturat sense eliminar dades ni volums.');
      } catch (error) {
        console.error(`[Nestly] Cleanup PostgreSQL no completat: ${error.message}`);
        exitCode = 1;
      }
    }
    process.removeListener('SIGINT', onSignal);
    process.removeListener('SIGTERM', onSignal);
    process.exitCode = exitCode;
  }
}

if (process.argv[1] && normalizePath(path.resolve(process.argv[1])) === normalizePath(fileURLToPath(import.meta.url))) {
  await launch();
}
