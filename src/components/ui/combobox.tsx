'use client';

import * as React from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Input } from './input';

export interface ComboboxOption {
  value: string;
  label: string;
}

interface ComboboxProps {
  options: ComboboxOption[];
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyPlaceholder?: string;
  disabled?: boolean;
}

export function Combobox({
  options,
  value,
  onChange,
  placeholder = 'Pilih opsi...',
  searchPlaceholder = 'Cari opsi...',
  emptyPlaceholder = 'Tidak ada opsi ditemukan.',
  disabled = false,
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [searchTerm, setSearchTerm] = React.useState('');

  const selectedOption = React.useMemo(() => 
    options.find((option) => option.value === value), 
    [options, value]
  );
  
  const filteredOptions = React.useMemo(() => 
    searchTerm === ''
      ? options
      : options.filter(option =>
          option.label.toLowerCase().includes(searchTerm.toLowerCase())
        ),
    [options, searchTerm]
  );

  const handleSelect = (optionValue: string) => {
    onChange(optionValue);
    setOpen(false);
    setSearchTerm('');
  };
  
  const handleAddNew = () => {
    if (searchTerm && !filteredOptions.some(o => o.label.toLowerCase() === searchTerm.toLowerCase())) {
        handleSelect(searchTerm);
    }
  }
  
  const handleInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
        event.preventDefault();
        handleAddNew();
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
          disabled={disabled}
        >
          <span className="truncate">
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[--radix-popover-trigger-width] p-0"
        align="start"
      >
        <div className="p-2">
            <Input 
                placeholder={searchPlaceholder}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={handleInputKeyDown}
                className="w-full"
            />
        </div>
        <div className="max-h-60 overflow-y-auto">
            {filteredOptions.length === 0 && searchTerm ? (
                 <Button
                    variant="ghost"
                    className="w-full justify-start font-normal"
                    onClick={handleAddNew}
                >
                    Tambah "{searchTerm}"
                </Button>
            ) : filteredOptions.length === 0 ? (
                <p className="p-4 text-center text-sm text-muted-foreground">{emptyPlaceholder}</p>
            ) : (
                <div className="p-1">
                {filteredOptions.map((option) => (
                    <Button
                        key={option.value}
                        variant="ghost"
                        className="w-full justify-start font-normal"
                        onClick={() => handleSelect(option.value)}
                    >
                    <Check
                        className={cn(
                        'mr-2 h-4 w-4',
                        value === option.value ? 'opacity-100' : 'opacity-0'
                        )}
                    />
                    {option.label}
                    </Button>
                ))}
                </div>
            )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
