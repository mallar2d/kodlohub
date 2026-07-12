import { NextResponse } from "next/server";
import { createSignalingTicket } from "@/lib/arena/auth";

export const revalidate = 0;

const SIGNALING_URL = process.env.ARENA_SIGNALING_URL || "wss://pdrrepo.onrender.com/ws";
const SERVICE_USER_ID = "kodlohub-service";
const SERVICE_DISPLAY_NAME = "KodloHUB";

interface RoomSummary {
  roomCode: string;
  mode: string;
  mapId: string;
  playerCount: number;
  maxPlayers: number;
  locked: boolean;
}

/** GET /api/arena/rooms — active rooms from signaling server. */
export async function GET() {
  try {
    const rooms = await fetchRoomsFromSignaling();
    return NextResponse.json(
      { rooms },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch rooms";
    return NextResponse.json(
      { error: message, rooms: [] },
      { status: 502, headers: { "Cache-Control": "no-store" } }
    );
  }
}

async function fetchRoomsFromSignaling(): Promise<RoomSummary[]> {
  return new Promise(async (resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("Timeout")), 8000);

    try {
      // Create a service ticket for the signaling server
      const ticket = await createSignalingTicket(SERVICE_USER_ID, SERVICE_DISPLAY_NAME);

      // Connect to signaling server via WebSocket
      const ws = new WebSocket(SIGNALING_URL);

      ws.onopen = () => {
        // Authenticate
        ws.send(JSON.stringify({
          type: "authenticate",
          token: ticket,
          protocolVersion: 1,
        }));
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(typeof event.data === "string" ? event.data : event.data.toString());

          if (message.type === "authenticated") {
            // Request room list
            ws.send(JSON.stringify({ type: "list_rooms" }));
          } else if (message.type === "room_list") {
            clearTimeout(timeout);
            ws.close();
            resolve(message.rooms || []);
          } else if (message.type === "error") {
            clearTimeout(timeout);
            ws.close();
            reject(new Error(message.message || "Signaling error"));
          }
        } catch {
          // Ignore parse errors
        }
      };

      ws.onerror = () => {
        clearTimeout(timeout);
        reject(new Error("WebSocket connection failed"));
      };

      ws.onclose = () => {
        clearTimeout(timeout);
      };
    } catch (err) {
      clearTimeout(timeout);
      reject(err);
    }
  });
}
