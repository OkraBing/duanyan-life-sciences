import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { mkdir, readFile, rename, unlink, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

const PREFIX = '/api/deployments';
const SERVICE_ID = /^[a-z0-9][a-z0-9-]{1,47}$/;
const hash = text => createHash('sha256').update(text).digest('hex');

class RequestError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function requireInput(condition, message) {
  if (!condition) throw new RequestError(400, message);
}

async function parseBody(req) {
  const limit = 2 * 1024 * 1024;
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('error', reject);
    req.on('data', chunk => {
      size += chunk.length;
      if (size <= limit) chunks.push(chunk);
    });
    req.on('end', () => {
      if (size > limit) return reject(new RequestError(413, '请求体超过 2 MB'));
      try {
        const body = JSON.parse(Buffer.concat(chunks));
        requireInput(body && typeof body === 'object' && !Array.isArray(body), '请求体必须是 JSON 对象');
        resolve(body);
      } catch (error) {
        reject(error instanceof RequestError ? error : new RequestError(400, '请求体必须是 JSON'));
      }
    });
  });
}

function normalizeModel(input) {
  requireInput(input?.kind === 'ds', '当前运行时支持表格打分模型');
  const { id, name, target, features, weights, mean, scale } = input;
  requireInput(typeof id === 'string' && id.length > 0 && id.length <= 100, '缺少有效的模型版本');
  requireInput(typeof name === 'string' && name.length <= 160, '模型名称无效');
  requireInput(typeof target === 'string' && target.length <= 160, '预测目标无效');
  requireInput(Array.isArray(features) && features.length > 0 && features.length <= 256 &&
    features.every(key => typeof key === 'string' && key.length > 0 && key.length <= 160) &&
    new Set(features).size === features.length, '输入特征无效');
  const count = features.length + 1;
  requireInput([weights, mean, scale].every(values =>
    Array.isArray(values) && values.length === count && values.every(Number.isFinite)
  ) && scale.every(value => value >= 0), '权重或标准化参数不完整');
  return { id, name, target, features, weights, mean, scale };
}

function metadata(service) {
  const { id, name, auth, maxRows, model, state, createdAt } = service;
  return {
    id, name, auth, maxRows, state, createdAt, runtime: 'cpu',
    model: { id: model.id, name: model.name, target: model.target, features: model.features },
    endpoint: PREFIX + '/' + id + '/predict'
  };
}

function predict(service, body) {
  const { model, maxRows } = service;
  requireInput(Array.isArray(body.rows) && body.rows.length > 0 && body.rows.length <= maxRows,
    'rows 必须包含 1 至 ' + maxRows + ' 行输入');
  const predictions = body.rows.map((row, i) => {
    requireInput(row && typeof row === 'object' && !Array.isArray(row), '第 ' + (i + 1) + ' 行必须是对象');
    let value = model.weights[0];
    model.features.forEach((key, j) => {
      requireInput(Object.hasOwn(row, key) && Number.isFinite(row[key]), '第 ' + (i + 1) + ' 行需要数值特征「' + key + '」');
      const k = j + 1;
      value += model.weights[k] * (row[key] - model.mean[k]) / (model.scale[k] || 1);
    });
    requireInput(Number.isFinite(value), '第 ' + (i + 1) + ' 行超出计算范围');
    return value;
  });
  return { modelVersion: model.id, target: model.target, predictions };
}

export async function openDeployments(file) {
  let services;
  try {
    services = JSON.parse(await readFile(file, 'utf8'));
    if (!Array.isArray(services)) throw new Error('在线服务存储格式无效');
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    services = [];
  }
  let pending = Promise.resolve();
  function change(apply) {
    const nextOperation = pending.then(async () => {
      const next = services.slice();
      const result = apply(next);
      const tmp = file + '.tmp';
      await mkdir(dirname(file), { recursive: true });
      try {
        await writeFile(tmp, JSON.stringify(next), { mode: 0o600 });
        await rename(tmp, file);
      } catch (error) {
        await unlink(tmp).catch(() => {});
        throw error;
      }
      services = next;
      return result;
    });
    pending = nextOperation.catch(() => {});
    return nextOperation;
  }
  return async function handle(req, path, reply) {
    if (path !== PREFIX && !path.startsWith(PREFIX + '/')) return false;
    try {
      const host = req.headers.host || '';
      if (!/^(?:127\.0\.0\.1|localhost)(?::[0-9]+)?$/.test(host) ||
          (req.headers.origin && req.headers.origin !== 'http://' + host)) {
        throw new RequestError(403, '在线部署 API 仅接受本机同源请求');
      }
      if (path === PREFIX && req.method === 'GET') {
        reply(200, { services: services.map(metadata) });
      } else if (path === PREFIX && req.method === 'POST') {
        const body = await parseBody(req);
        const id = typeof body.id === 'string' ? body.id.trim() : '';
        const name = typeof body.name === 'string' ? body.name.trim() : '';
        requireInput(SERVICE_ID.test(id), '服务标识用 2–48 位小写字母、数字或连字符');
        requireInput(name && name.length <= 60, '服务名称长度应为 1–60 个字符');
        requireInput(body.runtime === 'cpu', '请选择 CPU 运行时');
        requireInput(['local', 'token'].includes(body.auth), '请选择调用鉴权方式');
        requireInput(Number.isInteger(body.maxRows) && body.maxRows >= 1 && body.maxRows <= 1000, '单请求行数应为 1–1000');
        const model = normalizeModel(body.model);
        const token = body.auth === 'token' ? randomBytes(32).toString('hex') : '';
        const service = {
          id, name, model, maxRows: body.maxRows, auth: body.auth, tokenHash: token ? hash(token) : '',
          state: 'running', createdAt: new Date().toISOString()
        };
        await change(next => {
          if (next.some(item => item.id === id)) throw new RequestError(409, '服务标识已存在');
          if (next.length >= 128) throw new RequestError(409, '当前演示实例的服务数量已达上限');
          next.unshift(service);
        });
        reply(201, { service: metadata(service), ...(token ? { token } : {}) });
      } else {
        const match = /^\/api\/deployments\/([^/]+)(?:\/(predict))?$/.exec(path);
        const service = match && services.find(item => item.id === match[1]);
        if (!service) throw new RequestError(404, '在线服务不存在');
        if (req.method === 'POST' && match[2] === 'predict') {
          if (service.auth === 'token') {
            const token = (req.headers.authorization || '').match(/^Bearer ([0-9a-f]{64})$/)?.[1];
            if (!token || !timingSafeEqual(Buffer.from(hash(token), 'hex'), Buffer.from(service.tokenHash, 'hex'))) {
              throw new RequestError(401, '需要有效的调用令牌');
            }
          }
          if (service.state !== 'running') throw new RequestError(409, '服务已停止');
          reply(200, predict(service, await parseBody(req)));
        } else if (req.method === 'PATCH' && !match[2]) {
          const { state } = await parseBody(req);
          requireInput(state === 'running' || state === 'stopped', '服务状态无效');
          const updated = await change(next => {
            const i = next.findIndex(item => item.id === service.id);
            next[i] = { ...next[i], state };
            return next[i];
          });
          reply(200, { service: metadata(updated) });
        } else {
          throw new RequestError(405, '不支持该请求方法');
        }
      }
    } catch (error) {
      if (!(error instanceof RequestError)) console.error('在线部署操作失败：', error.message);
      reply(error.status || 500, { error: error.status ? error.message : '在线服务存储或执行失败' });
    }
    return true;
  };
}
