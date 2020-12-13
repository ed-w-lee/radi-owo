import { WEBSOCKET_URL } from '../settings';

export default function listenTo(roomId: string): WebSocket {
  const ws = new WebSocket(`${WEBSOCKET_URL}/rooms/${roomId}/listen`);

  ws.onopen = () => {
    ws.send(`this is a test for ${roomId}`);
  };

  return ws;
}
