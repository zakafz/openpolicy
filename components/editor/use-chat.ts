"use client";

import { type UseChatHelpers, useChat as useBaseChat } from "@ai-sdk/react";

import { AIChatPlugin } from "@platejs/ai/react";

import { DefaultChatTransport, type UIMessage } from "ai";
import { useEditorRef, usePluginOption } from "platejs/react";
import * as React from "react";

import { aiChatPlugin } from "@/components/editor/plugins/ai-kit";

export type ToolName = "edit" | "generate";

export type MessageDataPart = any;

export type Chat = UseChatHelpers<ChatMessage>;

export type ChatMessage = UIMessage<{}, MessageDataPart>;

export const useChat = () => {
  const editor = useEditorRef();
  const options = usePluginOption(aiChatPlugin, "chatOptions");

  const baseChat = useBaseChat<ChatMessage>({
    id: "editor",

    onData(data) {
      if (data.type === "data-toolName") {
        editor.setOption(AIChatPlugin, "toolName", data.data);
      }
    },
    onFinish: (_message) => {
      // console.log("[useChat] onFinish:", message);
    },
    onError: (_error) => {
      // console.error("[useChat] onError:", error);
    },
    transport: new DefaultChatTransport({
      ...options,
      fetch: async (_url: string | Request | URL, init?: RequestInit) => {
        return fetch("/api/ai/command", init);
      },
    }),
  });

  const chat = {
    ...baseChat,
  };

  React.useEffect(() => {
    editor.setOption(AIChatPlugin, "chat", chat as any);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chat.status, chat.messages, chat.error, editor.setOption]);

  return chat;
};
