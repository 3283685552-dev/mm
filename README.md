# Jiwen → EPhone MCP

This wraps ClaraShafiq/jiwen as a Streamable HTTP MCP server.

## Deploy

Use a Node.js hosting service such as Render.

Build command:
npm install

Start command:
npm start

After deployment, the MCP endpoint is:

https://YOUR-SERVICE.onrender.com/mcp

## EPhone import

After you have the real URL, use the generated EPhone JSON template and replace
the endpoint with your deployed `/mcp` URL.

## Tools

- jiwen_status
- jiwen_tick
- jiwen_set_last_message
- jiwen_prompt

Note: Jiwen state is held in memory. A restart resets the state.
