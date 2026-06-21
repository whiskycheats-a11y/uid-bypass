"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Copy, RefreshCw, Eye, EyeOff, Loader2 } from "lucide-react";

export function ApiKeyManager({ initialKey }: { initialKey: string }) {
  const [apiKey, setApiKey] = useState(initialKey);
  const [isVisible, setIsVisible] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isVisible && timeLeft > 0) {
      timer = setTimeout(() => {
        setTimeLeft(timeLeft - 1);
      }, 1000);
    } else if (isVisible && timeLeft === 0) {
      setIsVisible(false);
    }
    return () => clearTimeout(timer);
  }, [isVisible, timeLeft]);

  const toggleVisibility = () => {
    if (!isVisible) {
      setIsVisible(true);
      setTimeLeft(10);
    } else {
      setIsVisible(false);
      setTimeLeft(0);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(apiKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy", err);
    }
  };

  const handleRegenerate = async () => {
    if (!confirm("Are you sure you want to regenerate your API key? Your old key will instantly stop working for all your integrations!")) {
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch("/api/users/regenerate-key", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setApiKey(data.apiKey);
        alert("API Key regenerated successfully!");
      } else {
        alert(data.message || "Failed to regenerate API key");
      }
    } catch (err) {
      alert("An error occurred while regenerating the key.");
    } finally {
      setIsLoading(false);
    }
  };

  // Mask the API key if it's hidden
  const displayKey = isVisible ? apiKey : "•".repeat(apiKey.length > 40 ? 40 : apiKey.length);

  return (
    <div className="space-y-4">
      <div className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 font-mono text-sm text-amber-400 overflow-x-auto whitespace-nowrap">
        {displayKey}
      </div>
      
      <div className="flex flex-wrap items-center gap-3">
        <Button 
          variant="outline" 
          onClick={handleCopy}
          className="border-white/10 hover:bg-white/5 text-slate-300"
        >
          <Copy className="w-4 h-4 mr-2" />
          {copied ? "Copied!" : "Copy Key"}
        </Button>
        
        <Button 
          variant="outline" 
          onClick={handleRegenerate}
          disabled={isLoading}
          className="border-white/10 hover:bg-white/5 text-slate-300"
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4 mr-2" />
          )}
          Regenerate Key
        </Button>
        
        <Button 
          variant="outline" 
          onClick={toggleVisibility}
          className="border-white/10 hover:bg-white/5 text-slate-300 w-36"
        >
          {isVisible ? (
            <>
              <EyeOff className="w-4 h-4 mr-2" /> Hide ({timeLeft}s)
            </>
          ) : (
            <>
              <Eye className="w-4 h-4 mr-2" /> Show Key
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
