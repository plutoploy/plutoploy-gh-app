export default class MyServer {
  constructor(room) {
    this.room = room;
  }

  onMessage(msg, sender) {
    let data;
    try {
      data = JSON.parse(msg);
    } catch (e) {
      data = { message: msg };
    }


    const targetChannel = data.channel;

    this.room.broadcast(
      JSON.stringify({
        type: "broadcast",
        channel: targetChannel,
        payload: data.payload || data,
        sender: sender.id,
        timestamp: Date.now()
      }),
      [sender.id]
    );
  }
  async onRequest(req) {
    const url = new URL(req.url);
    if (req.method === "POST") {
      try {
        const body = await req.json();
        const targetChannel = body.channel;
        this.room.broadcast(
          JSON.stringify({
            type: "webhook",
            channel: targetChannel,
            payload: body.payload || body,
            timestamp: Date.now()
          })
        );

        return new Response(
          JSON.stringify({ success: true, connections: [...this.room.getConnections()].length }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" }
          }
        );
      } catch (err) {
        return new Response(
          JSON.stringify({ error: "Invalid JSON body" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }
    }

    if (req.method === "GET") {
      return new Response(
        JSON.stringify({
          room: this.room.id,
          connections: [...this.room.getConnections()].length
        }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response("Method not allowed", { status: 405 });
  }

  onConnect(conn) {
    console.log(`Client connected: ${conn.id} to room: ${this.room.id}`);
  }

  onClose(conn) {
    console.log(`Client disconnected: ${conn.id}`);
  }
}