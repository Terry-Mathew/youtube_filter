"use client";

import React, { useState, KeyboardEvent } from "react";
import { X, Plus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface KeywordInputProps {
  value: string[];
  onChange: (keywords: string[]) => void;
  placeholder?: string;
  maxKeywords?: number;
  maxKeywordLength?: number;
  suggestions?: string[];
  disabled?: boolean;
  error?: string;
}

const MAX_KEYWORDS = 10;
const MAX_KEYWORD_LENGTH = 30;

export function KeywordInput({
  value = [],
  onChange,
  placeholder = "Add keywords...",
  maxKeywords = MAX_KEYWORDS,
  maxKeywordLength = MAX_KEYWORD_LENGTH,
  suggestions = [],
  disabled = false,
  error
}: KeywordInputProps) {
  const [inputValue, setInputValue] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);

  const filteredSuggestions = suggestions.filter(
    suggestion => 
      suggestion.toLowerCase().includes(inputValue.toLowerCase()) &&
      !value.includes(suggestion)
  );

  const addKeyword = (keyword: string) => {
    const trimmedKeyword = keyword.trim();
    
    if (!trimmedKeyword) return;
    if (value.includes(trimmedKeyword)) return;
    if (value.length >= maxKeywords) return;
    if (trimmedKeyword.length > maxKeywordLength) return;

    onChange([...value, trimmedKeyword]);
    setInputValue("");
    setShowSuggestions(false);
  };

  const removeKeyword = (indexToRemove: number) => {
    onChange(value.filter((_, index) => index !== indexToRemove));
  };

  const handleInputKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addKeyword(inputValue);
    } else if (e.key === "Backspace" && !inputValue && value.length > 0) {
      removeKeyword(value.length - 1);
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
    }
  };

  const canAddMore = value.length < maxKeywords;

  return (
    <div className="space-y-2">
      {/* Keywords Display */}
      {value.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {value.map((keyword, index) => (
            <Badge
              key={index}
              variant="secondary"
              className="flex items-center gap-1 px-2 py-1"
            >
              <span className="text-sm">{keyword}</span>
              {!disabled && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-4 w-4 p-0 hover:bg-transparent"
                  onClick={() => removeKeyword(index)}
                  aria-label={`Remove ${keyword}`}
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </Badge>
          ))}
        </div>
      )}

      {/* Input Area */}
      {canAddMore && !disabled && (
        <div className="relative">
          <div className="flex gap-2">
            <Input
              value={inputValue}
              onChange={(e) => {
                setInputValue(e.target.value);
                setShowSuggestions(e.target.value.length > 0);
              }}
              onKeyDown={handleInputKeyDown}
              onFocus={() => setShowSuggestions(inputValue.length > 0)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              placeholder={placeholder}
              maxLength={maxKeywordLength}
              className={cn(error && "border-red-500")}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => addKeyword(inputValue)}
              disabled={!inputValue.trim()}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {/* Suggestions Dropdown */}
          {showSuggestions && filteredSuggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 z-10 mt-1 bg-white border rounded-md shadow-lg max-h-48 overflow-y-auto">
              {filteredSuggestions.slice(0, 5).map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 focus:bg-gray-50 focus:outline-none"
                  onClick={() => addKeyword(suggestion)}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Helper Text */}
      <div className="flex justify-between text-xs text-gray-500">
        <span>
          {value.length}/{maxKeywords} keywords
          {inputValue && ` • ${inputValue.length}/${maxKeywordLength} characters`}
        </span>
        {!canAddMore && (
          <span className="text-amber-600">Maximum keywords reached</span>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
    </div>
  );
} 