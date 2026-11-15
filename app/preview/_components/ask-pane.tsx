"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Send,
  Loader2,
  Sparkles,
  Bot,
  User,
  Wrench,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  XCircle,
  Clock,
  Trash2,
  FileCode,
  Shield,
  Layers,
  ArrowRight,
  Terminal,
} from "lucide-react";
import { ConversationMessage, AgentToolExecutionEvent } from "@/src/agent/types";
import { ParsedFile } from "@/src/parser/types";

interface AskPaneProps {
  analysisId?: string;
  repositoryName?: string;
  selectedFile?: ParsedFile | null;
  onSelectPath?: (filePath: string) => void;
  allFiles?: ParsedFile[];
}

interface ActiveToolExecution {
  tool: string;
  input: Record<string, any>;
  result?: any;
  status: "running" | "completed" | "failed";
}

export function AskPane({
  analysisId = "preview",
  repositoryName = "Repository",
  selectedFile,
  onSelectPath,
  allFiles = [],
}: AskPaneProps) {
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [inputQuestion, setInputQuestion] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [currentStatus, setCurrentStatus] = useState<string | null>(null);
  const [activeToolCalls, setActiveToolCalls] = useState<ActiveToolExecution[]>([]);
  const [streamingAnswer, setStreamingAnswer] = useState<string>("");
  const [expandedTools, setExpandedTools] = useState<Record<string, boolean>>({});

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Reset conversation when active analysis changes to prevent cross-repo leaks
  useEffect(() => {
    setMessages([]);
    setCurrentStatus(null);
    setActiveToolCalls([]);
    setStreamingAnswer("");
  }, [analysisId]);

  // Auto-scroll to bottom of conversation
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, currentStatus, activeToolCalls, streamingAnswer]);

  const toggleToolExpanded = (idx: string) => {
    setExpandedTools((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  const handleSend = async (questionToSend?: string) => {
    const q = (questionToSend || inputQuestion).trim();
    if (!q || isLoading) return;

    setInputQuestion("");
    setIsLoading(true);
    setCurrentStatus("Initializing agent session...");
    setActiveToolCalls([]);
    setStreamingAnswer("");

    const userMessage: ConversationMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: q,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMessage]);

    try {
      const response = await fetch(`/api/analysis/${encodeURIComponent(analysisId)}/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: q,
          history: messages,
          clientSessionId: `client-session-${analysisId}`,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: Failed to reach agent service`);
      }

      if (!response.body) {
        throw new Error("No readable stream received from agent service");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let accumulatedAnswer = "";
      const currentTools: ActiveToolExecution[] = [];

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.replace(/^data: /, "").trim();
          if (!jsonStr) continue;

          try {
            const event: AgentToolExecutionEvent = JSON.parse(jsonStr);

            switch (event.type) {
              case "status": {
                if (event.status) setCurrentStatus(event.status);
                break;
              }

              case "tool_call": {
                if (event.tool) {
                  currentTools.push({
                    tool: event.tool,
                    input: event.input || {},
                    status: "running",
                  });
                  setActiveToolCalls([...currentTools]);
                }
                break;
              }

              case "tool_result": {
                if (event.tool) {
                  const target = currentTools.find(
                    (t) => t.tool === event.tool && t.status === "running"
                  );
                  if (target) {
                    target.result = event.result;
                    target.status = event.result?.error ? "failed" : "completed";
                  } else {
                    currentTools.push({
                      tool: event.tool,
                      input: {},
                      result: event.result,
                      status: event.result?.error ? "failed" : "completed",
                    });
                  }
                  setActiveToolCalls([...currentTools]);
                }
                break;
              }

              case "answer": {
                if (event.text) {
                  accumulatedAnswer = event.text;
                  setStreamingAnswer(accumulatedAnswer);
                }
                break;
              }

              case "error": {
                throw new Error(event.error || "Agent execution failed");
              }

              case "done": {
                setCurrentStatus(null);
                break;
              }
            }
          } catch (parseErr) {
            console.warn("Failed to parse SSE event chunk:", parseErr);
          }
        }
      }

      // Commit finalized message to history
      const assistantMessage: ConversationMessage = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: accumulatedAnswer || "Agent completed without generating a summary.",
        toolCalls: currentTools,
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
      setActiveToolCalls([]);
      setStreamingAnswer("");
      setCurrentStatus(null);
    } catch (err: any) {
      const errorMessage: ConversationMessage = {
        id: `assistant-error-${Date.now()}`,
        role: "assistant",
        content: `Error: ${err.message || "Failed to communicate with the repository AI agent."}`,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, errorMessage]);
      setCurrentStatus(null);
      setActiveToolCalls([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const renderTextWithFileChips = (text: string) => {
    // Regex matching backticked paths or plain file-like tokens
    const parts = text.split(/(`[^`]+`)/g);

    return parts.map((part, pIdx) => {
      if (part.startsWith("`") && part.endsWith("`") && part.length > 2) {
        const rawToken = part.slice(1, -1);
        const isFilePath =
          rawToken.includes("/") ||
          rawToken.endsWith(".ts") ||
          rawToken.endsWith(".js") ||
          rawToken.endsWith(".tsx") ||
          rawToken.endsWith(".jsx") ||
          rawToken.endsWith(".py") ||
          rawToken.endsWith(".json");

        if (isFilePath) {
          return (
            <button
              key={pIdx}
              type="button"
              onClick={() => onSelectPath?.(rawToken)}
              className="inline-flex items-center gap-1 px-1.5 py-0.5 mx-0.5 text-[11px] font-mono font-medium rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500/20 transition-colors cursor-pointer"
              title={`Click to locate "${rawToken}" in repository map`}
            >
              <FileCode className="w-3 h-3 shrink-0" />
              <span>{rawToken}</span>
            </button>
          );
        }

        return (
          <code key={pIdx} className="px-1 py-0.5 rounded bg-[var(--color-surface-sunken)] font-mono text-[11px] text-[var(--color-text)]">
            {rawToken}
          </code>
        );
      }

      return <span key={pIdx}>{part}</span>;
    });
  };

  return (
    <div className="flex flex-col h-full bg-[var(--color-surface)] select-text">
      {/* 1. Header Banner: Analysis scoping badge */}
      <div className="px-4 py-2.5 border-b border-[var(--color-border)] bg-[var(--color-surface-sunken)]/50 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
            <Bot className="w-3.5 h-3.5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-[var(--color-text)]">Repository Agent</span>
              <span className="px-1.5 py-0.2 rounded-full text-[9px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Grounded
              </span>
            </div>
            <div className="flex items-center gap-1 text-[10px] text-[var(--color-text-muted)] font-mono">
              <Shield className="w-2.5 h-2.5 text-blue-400" />
              <span>Signed token · 6 tools</span>
            </div>
          </div>
        </div>

        {messages.length > 0 && (
          <button
            type="button"
            onClick={() => setMessages([])}
            className="p-1 rounded text-[var(--color-text-muted)] hover:text-red-400 hover:bg-red-500/10 transition-colors"
            title="Clear conversation"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* 2. Messages List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && !isLoading && (
          <div className="space-y-4 py-2">
            <div className="p-3.5 rounded-xl bg-[var(--color-surface-sunken)] border border-[var(--color-border)] space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-[var(--color-text)]">
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                <span>Interactive Repository Intelligence</span>
              </div>
              <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">
                Ask natural-language questions about <span className="font-semibold text-[var(--color-text)]">{repositoryName}</span>.
                The agent retrieves AST structures, routes, and dependency graphs in real time using dedicated tools.
              </p>
            </div>

            <div className="space-y-2">
              <span className="text-[11px] font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">
                Suggested Questions
              </span>
              <div className="flex flex-col gap-1.5">
                {[
                  "Give me an overall structural summary of this repository.",
                  "Which files are services or controllers?",
                  "What API routes are defined in the repository?",
                  selectedFile
                    ? `What is the blast radius of ${selectedFile.path}?`
                    : "Find auth files and check their dependencies.",
                ].map((sample, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSend(sample)}
                    className="text-left text-xs px-3 py-2 rounded-lg bg-[var(--color-surface-sunken)] hover:bg-[var(--color-surface-raised)] border border-[var(--color-border)] text-[var(--color-text)] hover:border-emerald-500/30 transition-all flex items-center justify-between group"
                  >
                    <span>{sample}</span>
                    <ArrowRight className="w-3 h-3 text-[var(--color-text-muted)] group-hover:text-emerald-400 transition-colors shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {messages.map((msg, mIdx) => (
          <div key={msg.id || mIdx} className="space-y-2">
            <div
              className={`flex items-start gap-2.5 ${
                msg.role === "user" ? "flex-row-reverse" : "flex-row"
              }`}
            >
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-xs font-semibold ${
                  msg.role === "user"
                    ? "bg-blue-600 text-white"
                    : "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                }`}
              >
                {msg.role === "user" ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
              </div>

              <div
                className={`max-w-[85%] rounded-xl px-3.5 py-2.5 text-xs leading-relaxed ${
                  msg.role === "user"
                    ? "bg-blue-600 text-white rounded-tr-none font-medium"
                    : "bg-[var(--color-surface-sunken)] border border-[var(--color-border)] text-[var(--color-text)] rounded-tl-none"
                }`}
              >
                {/* Collapsible tool calls attached to assistant message */}
                {msg.toolCalls && msg.toolCalls.length > 0 && (
                  <div className="mb-2.5 pb-2.5 border-b border-[var(--color-border)] space-y-1.5">
                    <span className="text-[10px] font-semibold text-[var(--color-text-muted)] uppercase tracking-wider flex items-center gap-1">
                      <Wrench className="w-2.5 h-2.5" />
                      <span>Executed Tools ({msg.toolCalls.length})</span>
                    </span>

                    {msg.toolCalls.map((t, tIdx) => {
                      const toolKey = `${msg.id}-tool-${tIdx}`;
                      const isExpanded = Boolean(expandedTools[toolKey]);

                      return (
                        <div
                          key={tIdx}
                          className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden text-[11px]"
                        >
                          <button
                            type="button"
                            onClick={() => toggleToolExpanded(toolKey)}
                            className="w-full px-2 py-1.5 flex items-center justify-between text-left hover:bg-[var(--color-surface-sunken)] transition-colors"
                          >
                            <div className="flex items-center gap-1.5 font-mono text-[10px]">
                              {t.status === "completed" ? (
                                <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                              ) : (
                                <XCircle className="w-3 h-3 text-red-400 shrink-0" />
                              )}
                              <span className="font-semibold text-emerald-400">{t.tool}</span>
                            </div>
                            <div className="flex items-center gap-1 text-[10px] text-[var(--color-text-muted)]">
                              <span>input</span>
                              {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                            </div>
                          </button>

                          {isExpanded && (
                            <div className="p-2 border-t border-[var(--color-border)] bg-[var(--color-surface-sunken)]/60 space-y-1 text-[10px] font-mono">
                              <div>
                                <span className="text-[var(--color-text-muted)]">args: </span>
                                <span>{JSON.stringify(t.input)}</span>
                              </div>
                              {t.result && (
                                <div className="max-h-32 overflow-y-auto pt-1 border-t border-[var(--color-border)]/50">
                                  <span className="text-[var(--color-text-muted)]">result: </span>
                                  <pre className="text-[9px] text-[var(--color-text-muted)] whitespace-pre-wrap">
                                    {JSON.stringify(t.result, null, 2)}
                                  </pre>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="whitespace-pre-wrap">{renderTextWithFileChips(msg.content)}</div>
              </div>
            </div>
          </div>
        ))}

        {/* Live streaming / execution state */}
        {isLoading && (
          <div className="space-y-3">
            <div className="flex items-start gap-2.5">
              <div className="w-6 h-6 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              </div>

              <div className="max-w-[85%] rounded-xl px-3.5 py-2.5 text-xs bg-[var(--color-surface-sunken)] border border-[var(--color-border)] text-[var(--color-text)] rounded-tl-none space-y-2.5">
                {/* Reasoning status pill */}
                {currentStatus && (
                  <div className="flex items-center gap-2 text-[11px] text-emerald-400 font-medium">
                    <Loader2 className="w-3 h-3 animate-spin shrink-0" />
                    <span>{currentStatus}</span>
                  </div>
                )}

                {/* Active streamed tool calls */}
                {activeToolCalls.length > 0 && (
                  <div className="space-y-1.5 pt-1 border-t border-[var(--color-border)]">
                    <span className="text-[10px] font-semibold text-[var(--color-text-muted)] uppercase tracking-wider flex items-center gap-1">
                      <Terminal className="w-2.5 h-2.5" />
                      <span>Live Tool Pipeline</span>
                    </span>

                    {activeToolCalls.map((t, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between px-2 py-1 rounded bg-[var(--color-surface)] border border-[var(--color-border)] text-[11px] font-mono"
                      >
                        <div className="flex items-center gap-1.5">
                          {t.status === "running" ? (
                            <Loader2 className="w-3 h-3 text-blue-400 animate-spin shrink-0" />
                          ) : t.status === "completed" ? (
                            <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                          ) : (
                            <XCircle className="w-3 h-3 text-red-400 shrink-0" />
                          )}
                          <span className="font-semibold text-[var(--color-text)]">{t.tool}</span>
                        </div>
                        <span className="text-[10px] text-[var(--color-text-muted)] truncate max-w-[120px]">
                          {JSON.stringify(t.input)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Partial / streaming answer prose */}
                {streamingAnswer && (
                  <div className="pt-2 border-t border-[var(--color-border)] whitespace-pre-wrap">
                    {renderTextWithFileChips(streamingAnswer)}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* 3. Input Form Area */}
      <div className="p-3 border-t border-[var(--color-border)] bg-[var(--color-surface)] shrink-0">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-end gap-2"
        >
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              rows={2}
              value={inputQuestion}
              onChange={(e) => setInputQuestion(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                selectedFile
                  ? `Ask about ${selectedFile.name} or repository...`
                  : "Ask a question about this repository..."
              }
              disabled={isLoading}
              className="w-full resize-none px-3 py-2 text-xs rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-sunken)] text-[var(--color-text)] placeholder-[var(--color-text-muted)] focus:outline-none focus:border-emerald-500/50 transition-colors disabled:opacity-50"
            />
          </div>

          <button
            type="submit"
            disabled={!inputQuestion.trim() || isLoading}
            className="p-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-medium transition-colors shrink-0 shadow-sm flex items-center justify-center cursor-pointer disabled:cursor-not-allowed"
            title="Send question (Enter)"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </form>
      </div>
    </div>
  );
}
