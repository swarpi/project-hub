import { http, HttpResponse } from "msw";

export const handlers = [
  http.post("*/v1/messages", () => {
    return HttpResponse.json({
      content: [{ type: "text", text: "Mock AI response" }],
    });
  }),
];
