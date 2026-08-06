import "server-only";
import sql from "mssql";

let pool: sql.ConnectionPool | null = null;
let connecting: Promise<sql.ConnectionPool> | null = null;

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} 환경변수가 설정되지 않았습니다.`);
  return value;
}

export async function getYerpPool(): Promise<sql.ConnectionPool> {
  if (pool?.connected) return pool;
  if (connecting) return connecting;

  const config: sql.config = {
    server: requireEnv("MSSQL_HOST"),
    port: Number(process.env.MSSQL_PORT ?? "1433"),
    database: requireEnv("MSSQL_DATABASE"),
    user: requireEnv("MSSQL_USER"),
    password: requireEnv("MSSQL_PASSWORD"),
    // 연간 목표대비 조회처럼 1년치를 통째로 집계하는 쿼리는 mssql 기본값(15초)을
    // 넘기는 경우가 있어 여유를 둔다.
    requestTimeout: 60000,
    connectionTimeout: 30000,
    options: {
      trustServerCertificate: true,
      encrypt: false,
    },
  };

  connecting = new sql.ConnectionPool(config)
    .connect()
    .then((connectedPool) => {
      pool = connectedPool;
      connecting = null;
      return connectedPool;
    })
    .catch((err) => {
      connecting = null;
      throw err;
    });

  return connecting;
}

export async function yerpQuery<T = Record<string, unknown>>(
  queryText: string,
  inputs?: Record<string, unknown>,
): Promise<T[]> {
  const connectedPool = await getYerpPool();
  const request = connectedPool.request();
  if (inputs) {
    for (const [name, value] of Object.entries(inputs)) {
      request.input(name, value);
    }
  }
  try {
    const result = await request.query<T>(queryText);
    return result.recordset;
  } catch (err) {
    // 커넥션 풀 안의 연결이 죽어있는 채로 남아있으면 이후 요청도 계속 타임아웃날 수 있어,
    // 실패 시 풀을 버리고 다음 요청에서 새로 연결하도록 한다.
    if (pool === connectedPool) pool = null;
    throw err;
  }
}
