import { TLSMode } from 'https://deno.land/x/mysql@v2.12.1/src/client.ts';
import { Client } from 'mysql';

export class Database {
  private static instance: Client;

  private constructor() {}

  public static async getInstance(): Promise<Client> {
    if (!Database.instance) {
      console.log('Creando nueva conexión a MySQL...');
      Database.instance = await new Client().connect({
        hostname: Deno.env.get('DB_HOST') || 'localhost',
        username: Deno.env.get('DB_USER') || 'root',
        db: 'test',
        password: Deno.env.get('DB_PASS') || 'password',
        poolSize: 10,
        port: 4000,
        tls: {
          mode: TLSMode.VERIFY_IDENTITY,
          caCerts: [Deno.env.get('CAT_KEY') || ''],
        },
      });
    }
    return Database.instance;
  }
}
