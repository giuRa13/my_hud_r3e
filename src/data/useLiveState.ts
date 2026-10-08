import { useEffect, useState } from 'react';
import ReconnectingWebSocket from './reconnectingWebsocket';
import type IShared from './r3eTypes';
/*
The protocol is request/response: 
the client sends an empty message, and dash.exe answers with the full game state as JSON. 
The official code does this on a timer, so it needs a setInterval that sends ''. 
The address is ws://localhost:8070/r3e, and there's an optional ?ws=host:port override.
*/

const UPDATE_MS = 33; // ~30 Hz. The official sample uses its own updateRate; lower = smoother

export function useLiveState() {
  const [state, setState] = useState<IShared | null>(null);

  useEffect(() => {
    const override = new URLSearchParams(location.search).get('ws');
    const address = override || 'localhost:8070';
    const ws = new ReconnectingWebSocket(`ws://${address}/r3e`);

    ws.onmessage = (e) => {
        const data: IShared = JSON.parse(e.data);
        if (!data.DriverData) return; 
        setState(data);
    };

    // dash.exe only answers when asked: each empty message returns one state
    const id = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) ws.send('');
    }, UPDATE_MS);

    return () => { clearInterval(id); ws.close(); };
    
  }, []);

  return state;
};