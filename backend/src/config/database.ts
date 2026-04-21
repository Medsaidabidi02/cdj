import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

class Database {
  private pool: mysql.Pool;

  constructor() {
    const dbUrl = process.env.DATABASE_URL;
    let connectionConfig: mysql.PoolOptions;

    if (dbUrl) {
      const url = new URL(dbUrl);
      connectionConfig = {
        host: url.hostname,
        port: parseInt(url.port) || 3307, // Reverted to 3307
        user: decodeURIComponent(url.username),
        password: decodeURIComponent(url.password),
        database: url.pathname.slice(1),
        waitForConnections: true,
        connectionLimit: 20,
        queueLimit: 0,
        charset: 'utf8mb4'
      };
    } else {
      connectionConfig = {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '3307'), // Reverted to 3307
        user: process.env.DB_USER || 'c2668909c_clinique_user',
        password: process.env.DB_PASSWORD || 'bKM8P}ZPWhH+{)Fg',
        database: process.env.DB_NAME || 'c2668909c_clinique_db',
        waitForConnections: true,
        connectionLimit: 20,
        queueLimit: 0,
        charset: 'utf8mb4'
      };
    }

    this.pool = mysql.createPool(connectionConfig);
    this.testConnection().then(() => this.runMigrations());
  }

  async query(text: string, params?: any[]): Promise<any> {
    try {
      const [rows, fields] = await this.pool.execute(text, params);
      
      // Handle INSERT/UPDATE/DELETE results
      if (rows && typeof rows === 'object' && 'insertId' in rows) {
        return {
          rows: [],
          fields,
          insertId: (rows as any).insertId,
          affectedRows: (rows as any).affectedRows
        };
      }
      
      // Handle SELECT results
      return { 
        rows: Array.isArray(rows) ? rows : [], 
        fields,
        insertId: undefined,
        affectedRows: undefined
      };
    } catch (error) {
      console.error('Query error:', error);
      throw error;
    }
  }

  async close(): Promise<void> {
    await this.pool.end();
  }

  async testConnection(): Promise<boolean> {
    try {
      const [rows] = await this.pool.execute('SELECT NOW() as now');
      console.log('🔗 Connected to MySQL database');
      return true;
    } catch (error) {
      console.error('❌ Database connection failed:', error);
      return false;
    }
  }

  /** Auto-apply lightweight schema additions so the server works without manual SQL runs. */
  async runMigrations(): Promise<void> {
    try {
      // Ensure profile_picture and avatar_updated_at columns exist on users
      await this.pool.execute(
        `ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_picture VARCHAR(512) NULL`
      );
      await this.pool.execute(
        `ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_updated_at TIMESTAMP NULL`
      );

      // Ensure the device-tracking table exists
      await this.pool.execute(`
        CREATE TABLE IF NOT EXISTS user_login_devices (
          id            INT AUTO_INCREMENT PRIMARY KEY,
          user_id       INT          NOT NULL,
          ip_address    VARCHAR(45)  NOT NULL,
          user_agent    VARCHAR(512) NULL,
          browser_name  VARCHAR(100) NULL,
          os_name       VARCHAR(100) NULL,
          logged_in_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          INDEX idx_uld_user      (user_id),
          INDEX idx_uld_logged_in (logged_in_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);

      // 🔔 Notifications Table
      await this.pool.execute(`
        CREATE TABLE IF NOT EXISTS notifications (
          id            INT AUTO_INCREMENT PRIMARY KEY,
          user_id       INT          NOT NULL,
          title         VARCHAR(255) NOT NULL,
          message       TEXT         NOT NULL,
          type          ENUM('blog', 'inbox', 'video', 'system') NOT NULL,
          rel_id        INT          NULL,
          is_read       BOOLEAN      NOT NULL DEFAULT FALSE,
          created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          INDEX idx_notif_user (user_id),
          INDEX idx_notif_read (is_read),
          INDEX idx_notif_created (created_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);

      // 📲 Push Subscriptions Table
      await this.pool.execute(`
        CREATE TABLE IF NOT EXISTS push_subscriptions (
          id                INT AUTO_INCREMENT PRIMARY KEY,
          user_id           INT          NOT NULL,
          endpoint          VARCHAR(512) NOT NULL,
          p256dh            VARCHAR(255) NOT NULL,
          auth_key          VARCHAR(255) NOT NULL,
          user_agent        VARCHAR(512) NULL,
          created_at        TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at        TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          UNIQUE KEY (endpoint),
          INDEX idx_ps_user (user_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);

      // 💬 Blog Comments Table
      await this.pool.execute(`
        CREATE TABLE IF NOT EXISTS blog_comments (
          id            INT AUTO_INCREMENT PRIMARY KEY,
          post_id       INT          NOT NULL,
          user_id       INT          NOT NULL,
          content       TEXT         NOT NULL,
          is_active     BOOLEAN      NOT NULL DEFAULT TRUE,
          created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (post_id) REFERENCES blog_posts(id) ON DELETE CASCADE,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          INDEX idx_bc_post (post_id),
          INDEX idx_bc_user (user_id),
          INDEX idx_bc_created (created_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);

      console.log('✅ Database migrations applied');
    } catch (err: any) {
      console.warn('⚠️ Migration warning (non-fatal):', err?.message || err);
    }
  }

  getPool(): mysql.Pool {
    return this.pool;
  }
}

export default new Database();


//database mta3 local al bureau 