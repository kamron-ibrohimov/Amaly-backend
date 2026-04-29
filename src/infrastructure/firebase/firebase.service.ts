import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';

@Injectable()
export class FirebaseService implements OnModuleInit {
  private readonly logger = new Logger(FirebaseService.name);

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    const serviceAccountPath = this.config.get<string>('FIREBASE_SERVICE_ACCOUNT_PATH');

    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccountPath!),
      });
      this.logger.log('Firebase initialized ✅');
    }
  }

  async sendToDevice(token: string, title: string, body: string, data?: Record<string, string>) {
    try {
      await admin.messaging().send({
        token,
        notification: { title, body },
        data: data ?? {},
        android: {
          priority: 'high',
          notification: { sound: 'default' },
        },
        apns: {
          payload: {
            aps: { sound: 'default' },
          },
        },
      });
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.warn(`FCM yuborishda xato [${token}]: ${message}`);
      }
  }

  async sendToMultiple(tokens: string[], title: string, body: string, data?: Record<string, string>) {
    if (!tokens.length) return;

    const messages = tokens.map((token) => ({
      token,
      notification: { title, body },
      data: data ?? {},
    }));

    try {
      await admin.messaging().sendEach(messages);
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.warn(`FCM multi-send xato: ${message}`);
      }
  }
}