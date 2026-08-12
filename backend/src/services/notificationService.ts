import webpush from 'web-push';
import { Server } from 'socket.io';
import database from '../config/database';
import dotenv from 'dotenv';

dotenv.config();

// Configure web-push with VAPID keys
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    process.env.MAILTO || 'mailto:cliniquedesjuristes@gmail.com',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
  console.log('📲 Web-Push VAPID details configured');
}

class NotificationService {
  private io: Server | null = null;

  setIo(io: Server) {
    this.io = io;
  }

  /**
   * Send a notification to a specific user
   */
  async notifyUser(userId: number, data: { title: string; message: string; type: 'blog' | 'inbox' | 'video' | 'system'; rel_id?: number }) {
    try {
      // 1. Save to database
      const result = await database.query(`
        INSERT INTO notifications (user_id, title, message, type, rel_id, created_at)
        VALUES (?, ?, ?, ?, ?, NOW())
      `, [userId, data.title, data.message, data.type, data.rel_id || null]);

      const notification = {
        id: result.insertId,
        ...data,
        is_read: false,
        created_at: new Date().toISOString()
      };

      // 2. Emit via Socket.io if online
      if (this.io) {
        this.io.to(`user_${userId}`).emit('notification', notification);
        // Also emit for the bottom-left toast
        this.io.to(`user_${userId}`).emit('toast', notification);
      }

      // 3. Send via Web-Push
      await this.sendPushNotification(userId, notification);

      return notification;
    } catch (error) {
      console.error(`❌ Error notifying user ${userId}:`, error);
    }
  }

  /**
   * Notify multiple users (e.g. everyone or course enrollees)
   */
  async notifyUsers(userIds: number[], data: { title: string; message: string; type: 'blog' | 'inbox' | 'video' | 'system'; rel_id?: number }) {
    const promises = userIds.map(id => this.notifyUser(id, data));
    return Promise.all(promises);
  }

  /**
   * Internal: Send push notification via browser Push API
   */
  private async sendPushNotification(userId: number, notification: any) {
    try {
      const subs = await database.query('SELECT endpoint, p256dh, auth_key FROM push_subscriptions WHERE user_id = ?', [userId]);
      
      const payload = JSON.stringify({
        title: notification.title,
        body: notification.message,
        icon: '/logo192.png',
        data: {
          url: this.getNotificationUrl(notification),
          id: notification.id
        }
      });

      for (const row of subs.rows) {
        try {
          const subscription = {
            endpoint: row.endpoint,
            keys: {
              p256dh: row.p256dh,
              auth: row.auth_key
            }
          };
          await webpush.sendNotification(subscription, payload);
        } catch (pushErr: any) {
          if (pushErr.statusCode === 410 || pushErr.statusCode === 404) {
            console.log(`🗑️ Removing expired push subscription for user ${userId}`);
            await database.query('DELETE FROM push_subscriptions WHERE endpoint = ?', [row.endpoint]);
          } else {
            console.error('❌ Push error:', pushErr.message);
          }
        }
      }
    } catch (error) {
      console.error('❌ Error in sendPushNotification:', error);
    }
  }

  private getNotificationUrl(notification: any): string {
    switch (notification.type) {
      case 'blog': return `/blog/${notification.rel_id}`;
      case 'inbox': return `/inbox/${notification.rel_id}`;
      case 'video': return `/course/${notification.rel_id}`; // Simplified
      default: return '/';
    }
  }
}

export default new NotificationService();
