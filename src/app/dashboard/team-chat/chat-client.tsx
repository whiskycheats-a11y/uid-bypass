"use client";

import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Loader2, UserCircle, MessageCircle } from "lucide-react";
import { format, isToday, isYesterday } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";

interface ChatMessage {
  id: string;
  content: string;
  createdAt: string;
  user: {
    username: string;
    role: string;
    profilePicture?: string;
  };
}

function ChatAvatar({ src, username }: { src?: string | null, username: string }) {
  const [error, setError] = useState(false);
  
  const hasValidSrc = src && (src.startsWith('http') || src.startsWith('data:image'));
  
  if (hasValidSrc && !error) {
    return (
      <img 
        src={src} 
        alt={username} 
        className="w-full h-full object-cover" 
        onError={(e) => {
          setError(true);
          e.currentTarget.style.display = 'none';
        }} 
      />
    );
  }
  
  const initials = username.replace(/[^a-zA-Z0-9]/g, '').slice(0, 2).toUpperCase() || '?';
  return (
    <span className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-500/40 to-violet-500/40 text-[10px] md:text-xs font-bold text-blue-300">
      {initials}
    </span>
  );
}

export function ChatClient({ currentUsername }: { currentUsername: string }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Mention Autocomplete State
  const [mentionUsers, setMentionUsers] = useState<{username: string, role: string, profilePicture?: string}[]>([]);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionFilter, setMentionFilter] = useState("");
  const [cursorPosition, setCursorPosition] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const fetchMessages = async () => {
    try {
      const res = await fetch("/api/chat");
      const data = await res.json();
      if (res.ok) setMessages(data.messages);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    setTimeout(() => fetchMessages(), 0);
    const interval = setInterval(fetchMessages, 5000); // Poll every 5s
    
    // Mark as read when viewing chat
    localStorage.setItem("lastReadChatAt", new Date().toISOString());
    window.dispatchEvent(new Event("chatRead"));

    // Fetch all users for mention autocomplete
    fetch("/api/chat/users")
      .then(res => res.json())
      .then(data => {
        if (data.users) setMentionUsers(data.users);
      })
      .catch(console.error);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem("lastReadChatAt", new Date().toISOString());
      window.dispatchEvent(new Event("chatRead"));
    }
  }, [messages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    setLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newMessage }),
      });
      if (res.ok) {
        setNewMessage("");
        fetchMessages();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setNewMessage(val);
    
    const cursorPos = e.target.selectionStart || 0;
    const textBeforeCursor = val.slice(0, cursorPos);
    const lastWordRegex = /@([\w\d]*)$/;
    const match = textBeforeCursor.match(lastWordRegex);

    if (match) {
      setMentionFilter(match[1].toLowerCase());
      setShowMentions(true);
      setCursorPosition(cursorPos);
    } else {
      setShowMentions(false);
    }
  };

  const handleMentionSelect = (username: string) => {
    const textBeforeCursor = newMessage.slice(0, cursorPosition);
    const textAfterCursor = newMessage.slice(cursorPosition);
    
    const lastWordRegex = /@([\w\d]*)$/;
    const newTextBefore = textBeforeCursor.replace(lastWordRegex, `@${username} `);
    
    setNewMessage(newTextBefore + textAfterCursor);
    setShowMentions(false);
    inputRef.current?.focus();
  };

  const renderMessageContent = (content: string) => {
    // Simple regex to match @username, @everyone, @here
    const mentionRegex = /(@[\w\d]+)/g;
    const parts = content.split(mentionRegex);

    return parts.map((part, i) => {
      if (part.startsWith("@")) {
        const mentioned = part.substring(1);
        const isMe = mentioned === currentUsername;
        const isGlobal = mentioned === "everyone" || mentioned === "here";
        
        if (isMe || isGlobal) {
          return (
            <span key={i} className="bg-yellow-500/20 text-yellow-300 px-1 py-0.5 rounded font-bold">
              {part}
            </span>
          );
        }
        return (
          <span key={i} className="bg-blue-500/20 text-blue-300 px-1 py-0.5 rounded font-bold">
            {part}
          </span>
        );
      }
      return <span key={i}>{part}</span>;
    });
  };

  return (
    <Card className="glass-card flex flex-col h-[calc(100vh-10rem)] min-h-[500px] md:h-[700px]">
      <CardHeader className="border-b border-white/[0.08] p-4 md:p-6">
        <CardTitle>Global Reseller Chat</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden flex flex-col p-0">
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="text-center text-slate-500 mt-10">No messages yet. Be the first to say hi!</div>
          ) : (
            messages.map((msg, index) => {
              const isMe = msg.user.username === currentUsername;
              const msgDate = new Date(msg.createdAt);
              const currentDateStr = format(msgDate, "yyyy-MM-dd");
              
              let showDateDivider = false;
              if (index === 0) {
                showDateDivider = true;
              } else {
                const prevDateStr = format(new Date(messages[index - 1].createdAt), "yyyy-MM-dd");
                if (currentDateStr !== prevDateStr) {
                  showDateDivider = true;
                }
              }

              let dateDisplay = format(msgDate, "MMMM d, yyyy");
              if (isToday(msgDate)) dateDisplay = "Today";
              else if (isYesterday(msgDate)) dateDisplay = "Yesterday";

              return (
                <div key={msg.id} className="flex flex-col">
                  {showDateDivider && (
                    <div className="flex justify-center my-6">
                      <div className="bg-white/5 border border-white/10 px-3 py-1 rounded-full text-xs font-medium text-slate-400 shadow-sm">
                        {dateDisplay}
                      </div>
                    </div>
                  )}
                  <motion.div 
                    initial={{ opacity: 0, y: 10, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.2 }}
                    className={`flex gap-2 md:gap-3 ${isMe ? "flex-row-reverse" : "flex-row"} mb-2`}
                  >
                    <div className="w-6 h-6 md:w-8 md:h-8 rounded-full overflow-hidden bg-slate-800 flex-shrink-0 border border-white/10 flex items-center justify-center mt-1">
                      <ChatAvatar src={msg.user.profilePicture} username={msg.user.username} />
                    </div>

                    <div className={`flex flex-col ${isMe ? "items-end" : "items-start"} max-w-[85%] md:max-w-[75%]`}>
                      <div className={`flex items-baseline gap-2 mb-1 px-1 ${isMe ? "flex-row-reverse" : "flex-row"}`}>
                        <span className="text-xs font-medium text-slate-300">{msg.user.username}</span>
                        <Badge variant={msg.user.role.toLowerCase() as "admin" | "manager" | "reseller" | "default"} className="text-[10px] px-1 py-0 h-4">
                          {msg.user.role}
                        </Badge>
                        <span className="text-[10px] text-slate-500">
                          {format(msgDate, "HH:mm")}
                        </span>
                      </div>
                      <div 
                        className={`px-4 py-2 rounded-2xl ${
                          isMe 
                            ? "bg-blue-600 text-white rounded-tr-sm" 
                            : "bg-white/[0.05] border border-white/[0.08] text-slate-200 rounded-tl-sm"
                        } ${
                          (!isMe && (msg.content.includes(`@${currentUsername}`) || msg.content.includes("@everyone") || msg.content.includes("@here")))
                            ? "ring-2 ring-yellow-500/50 bg-yellow-500/10"
                            : ""
                        }`}
                      >
                        {renderMessageContent(msg.content)}
                      </div>
                    </div>
                  </motion.div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>
        
        <div className="p-4 border-t border-white/[0.08] bg-black/20 relative">
          <AnimatePresence>
            {showMentions && (
              <motion.div 
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className="absolute bottom-full left-4 mb-2 w-64 bg-[#0a0a1a] backdrop-blur-3xl border border-white/20 rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.8)] overflow-hidden z-50 flex flex-col"
              >
                <div className="px-3 py-2 text-[10px] uppercase font-bold tracking-wider text-slate-400 bg-white/5 border-b border-white/10">
                  Members matching @{mentionFilter}
                </div>
                <div className="max-h-48 overflow-y-auto p-1 custom-scrollbar">
                  {mentionUsers
                    .filter(u => u.username.toLowerCase().includes(mentionFilter))
                    .slice(0, 10)
                    .map(u => (
                      <button
                        key={u.username}
                        type="button"
                        onClick={() => handleMentionSelect(u.username)}
                        className="w-full flex items-center gap-2 px-2 py-1.5 hover:bg-white/10 rounded-lg text-left transition-colors group"
                      >
                        <div className="w-6 h-6 rounded-full overflow-hidden bg-slate-800 flex-shrink-0 border border-white/10">
                          <ChatAvatar src={u.profilePicture} username={u.username} />
                        </div>
                        <span className="text-sm text-slate-200 font-medium truncate flex-1">{u.username}</span>
                        <Badge variant={u.role.toLowerCase() as "admin" | "manager" | "reseller" | "default"} className="text-[9px] px-1 py-0 h-3">
                          {u.role}
                        </Badge>
                      </button>
                    ))}
                  {mentionUsers.filter(u => u.username.toLowerCase().includes(mentionFilter)).length === 0 && (
                    <div className="text-center text-xs text-slate-500 py-4">No users found</div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          <form onSubmit={handleSend} className="flex gap-2">
            <Input
              ref={inputRef}
              value={newMessage}
              onChange={handleInputChange}
              placeholder="Type your message... use @ to ping"
              className="flex-1 bg-white/[0.03] border-white/[0.08]"
              disabled={loading}
              maxLength={500}
              icon={<MessageCircle className="w-4 h-4" />}
            />
            <Button type="submit" disabled={loading || !newMessage.trim()}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </form>
        </div>
      </CardContent>
    </Card>
  );
}
