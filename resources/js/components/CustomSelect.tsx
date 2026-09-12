import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";

export interface CustomSelectOption {
  value: string | number;
  label: string;
  disabled?: boolean;
}

interface CustomSelectProps {
  value: string | number | null | undefined;
  onChange: (value: any) => void;
  options: CustomSelectOption[];
  placeholder?: string;
  className?: string;
  buttonClassName?: string;
  disabled?: boolean;
  error?: boolean | string;
}

export default function CustomSelect({
  value,
  onChange,
  options,
  placeholder = "Pilih...",
  className = "",
  buttonClassName = "",
  disabled = false,
  error = false,
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find(
    (opt) => String(opt.value) === String(value)
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("touchstart", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const handleSelect = (option: CustomSelectOption) => {
    if (option.disabled || disabled) return;
    onChange(option.value);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        className={`w-full bg-white rounded-xl px-4 py-3 border text-left flex items-center justify-between text-sm transition-all duration-150 ${
          error
            ? "border-red-500 focus:ring-2 focus:ring-red-300"
            : isOpen
            ? "border-[#D9A978] ring-2 ring-[#D9A978] shadow-sm"
            : "border-gray-200 hover:border-[#D9A978]/60 focus:ring-2 focus:ring-[#D9A978]"
        } ${disabled ? "bg-gray-100 cursor-not-allowed opacity-60" : "cursor-pointer"} ${buttonClassName}`}
      >
        <span
          className={`truncate block pr-2 ${
            selectedOption ? "text-gray-800 font-medium" : "text-gray-400"
          }`}
        >
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown
          className={`w-4 h-4 flex-shrink-0 text-[#C19A6B] transition-transform duration-200 ${
            isOpen ? "rotate-180 text-[#7A4A2B]" : ""
          }`}
        />
      </button>

      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white rounded-2xl shadow-xl border border-[#F6E1C6] p-1.5 max-h-60 overflow-y-auto animate-in fade-in-0 zoom-in-95 duration-150">
          {options.length === 0 ? (
            <div className="px-4 py-3 text-xs text-gray-400 text-center">
              Tidak ada pilihan
            </div>
          ) : (
            <div className="space-y-0.5">
              {options.map((opt) => {
                const isSelected = String(opt.value) === String(value);

                return (
                  <button
                    key={String(opt.value)}
                    type="button"
                    disabled={opt.disabled}
                    onClick={() => handleSelect(opt)}
                    className={`w-full px-3.5 py-2.5 text-left text-sm flex items-center justify-between rounded-xl transition-colors duration-150 ${
                      opt.disabled
                        ? "text-gray-300 cursor-not-allowed"
                        : isSelected
                        ? "bg-[#FDF3E4] text-[#7A4A2B] font-bold"
                        : "text-gray-700 hover:bg-[#FFF7EC] hover:text-[#7A4A2B] font-medium"
                    }`}
                  >
                    <span className="truncate">{opt.label}</span>
                    {isSelected && (
                      <Check className="w-4 h-4 text-[#C19A6B] flex-shrink-0 ml-2" />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
