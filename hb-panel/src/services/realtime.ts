import { io } from 'socket.io-client';

const API_URL =
  import.meta.env.VITE_API_URL ||
  'http://localhost:3000';

export const realtime = io(
  API_URL,
  {
    autoConnect: false,
    transports: [
      'websocket',
      'polling',
    ],
  },
);

export function connectRealtime() {
  if (!realtime.connected) {
    realtime.connect();
  }

  const userRaw =
    localStorage.getItem('user');

  if (!userRaw) {
    return;
  }

  try {
    const user =
      JSON.parse(userRaw) as {
        gymId?: string | null;
        gym?: {
          id?: string | null;
        } | null;
      };

    const gymId =
      user.gymId ||
      user.gym?.id;

    if (gymId) {
      realtime.emit(
        'gym:join',
        String(gymId),
      );
    }
  } catch {
    // Geçersiz localStorage verisi bağlantıyı durdurmaz.
  }
}
