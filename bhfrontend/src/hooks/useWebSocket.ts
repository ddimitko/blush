import { useEffect, useRef, useState } from 'react';
import { useAuth } from './useAuth';
import { convertWebSocketTimestamp } from '../lib/timezone';

interface WebSocketMessage {
  type: string;
  version?: string;
  messageId?: string;
  topic?: string;
  payload?: any;
  timestamp?: string;
  correlationId?: string;
  priority?: 'HIGH' | 'NORMAL' | 'LOW';
  ttlSeconds?: number;
  retryCount?: number;
  maxRetries?: number;
  error?: {
    code: string;
    message: string;
    details?: string;
    timestamp: string;
  };
  metadata?: Record<string, any>;
  reason?: string;
  [key: string]: any;
}

interface UseWebSocketOptions {
  url: string;
  onMessage?: (message: WebSocketMessage) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Event) => void;
  autoReconnect?: boolean;
  reconnectInterval?: number;
}

export const useWebSocket = (options: UseWebSocketOptions) => {
  const { token } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastHeartbeatRef = useRef<number>(0);

  // Heartbeat configuration
  const HEARTBEAT_INTERVAL = 30000; // 30 seconds
  const HEARTBEAT_TIMEOUT = 60000; // 60 seconds

  const connect = () => {
    try {
      // Don't create connection if URL is empty
      if (!options.url || options.url.trim() === '') {
        console.log('WebSocket URL is empty, skipping connection');
        return;
      }

      // Prevent multiple connections in React Strict Mode
      if (wsRef.current && wsRef.current.readyState === WebSocket.CONNECTING) {
        console.log('WebSocket already connecting, skipping...');
        return;
      }

      // Close existing connection if any
      if (wsRef.current) {
        wsRef.current.close();
      }

      // Don't add token to URL, send it as a message after connection
      const ws = new WebSocket(options.url);
      wsRef.current = ws;

      ws.onopen = () => {
        // Check if this WebSocket is still the current one (prevent race conditions)
        if (wsRef.current !== ws) {
          console.log('WebSocket opened but is no longer current, closing...');
          ws.close();
          return;
        }

        console.log('WebSocket connected');
        setIsConnected(true);
        setConnectionError(null);
        reconnectAttemptsRef.current = 0;
        lastHeartbeatRef.current = Date.now();

        // Send authentication message if token is available
        if (token) {
          ws.send(JSON.stringify({
            type: 'authenticate',
            token: token
          }));
        }

        // Start heartbeat monitoring
        startHeartbeat();

        options.onConnect?.();
      };

      ws.onmessage = (event) => {
        try {
          const rawMessage: WebSocketMessage = JSON.parse(event.data);

          // Handle heartbeat messages
          if (rawMessage.type === 'HEARTBEAT') {
            handleHeartbeat(rawMessage);
            return;
          }

          // Send acknowledgment for high-priority messages
          if (rawMessage.priority === 'HIGH' && rawMessage.messageId) {
            sendAcknowledgment(rawMessage.messageId);
          }

          // Convert UTC timestamps to include local timezone information
          const message = convertWebSocketTimestamp(rawMessage);
          options.onMessage?.(message);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      ws.onclose = (event) => {
        // Check if this WebSocket is still the current one
        if (wsRef.current !== ws) {
          console.log('WebSocket closed but is no longer current, ignoring...');
          return;
        }

        console.log('WebSocket disconnected:', event.code, event.reason);
        setIsConnected(false);
        wsRef.current = null;
        options.onDisconnect?.();

        // Auto-reconnect if enabled and not a manual closure (code 1000)
        if (options.autoReconnect && event.code !== 1000 && reconnectAttemptsRef.current < maxReconnectAttempts) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttemptsRef.current++;
            connect();
          }, delay);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setConnectionError('Connection failed');
        options.onError?.(error);
      };
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      setConnectionError('Failed to connect');
    }
  };

  const disconnect = () => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close(1000, 'Manual disconnect');
      wsRef.current = null;
    }

    setIsConnected(false);
  };

  const handleHeartbeat = (message: WebSocketMessage) => {
    if (message.payload?.type === 'PING') {
      // Respond to server ping with pong
      sendMessage({
        type: 'heartbeat',
        heartbeatType: 'PONG',
        timestamp: new Date().toISOString()
      });
      lastHeartbeatRef.current = Date.now();
    }
  };

  const sendAcknowledgment = (messageId: string) => {
    sendMessage({
      type: 'message_ack',
      messageId: messageId,
      timestamp: new Date().toISOString()
    });
  };

  const startHeartbeat = () => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
    }

    heartbeatIntervalRef.current = setInterval(() => {
      const now = Date.now();
      if (lastHeartbeatRef.current > 0 && (now - lastHeartbeatRef.current) > HEARTBEAT_TIMEOUT) {
        console.warn('WebSocket heartbeat timeout, attempting reconnect...');
        disconnect();
        if (options.autoReconnect) {
          connect();
        }
      }
    }, HEARTBEAT_INTERVAL);
  };

  const sendMessage = (message: any) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
      return true;
    }
    return false;
  };

  useEffect(() => {
    // Don't create connection if URL is empty
    if (!options.url || options.url.trim() === '') {
      console.log('WebSocket URL is empty, not creating connection');
      return;
    }



    // Add a small delay to prevent React Strict Mode double-invocation issues
    const timeoutId = setTimeout(() => {
      connect();
    }, 10);

    return () => {
      clearTimeout(timeoutId);
      disconnect();
    };
  }, [options.url, token]);

  return {
    isConnected,
    connectionError,
    sendMessage,
    disconnect,
    reconnect: connect,
  };
};

export default useWebSocket;
