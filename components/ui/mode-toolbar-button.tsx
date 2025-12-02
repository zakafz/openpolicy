'use client';

import * as React from 'react';

import type { DropdownMenuProps } from '@radix-ui/react-dropdown-menu';
import { CheckIcon, EyeIcon, PenIcon } from 'lucide-react';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { DropdownMenuItemIndicator } from '@radix-ui/react-dropdown-menu';
import { useEditorContext } from '@/components/editor/editor-context';

import { ToolbarButton } from './toolbar';

export function ModeToolbarButton(props: DropdownMenuProps) {
  const [open, setOpen] = React.useState(false);

  // Get custom props from context
  const { isEditMode, onEditModeToggle, doc } = useEditorContext();

  // Determine current value based on edit mode
  const value = isEditMode ? 'editing' : 'viewing';

  const item: Record<string, { icon: React.ReactNode; label: string }> = {
    editing: {
      icon: <PenIcon />,
      label: 'Editing',
    },
    viewing: {
      icon: <EyeIcon />,
      label: 'Viewing',
    },
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen} modal={false} {...props}>
      <DropdownMenuTrigger asChild>
        <ToolbarButton pressed={open} tooltip="Editing mode" isDropdown>
          {item[value].icon}
          <span className="hidden lg:inline">{item[value].label}</span>
        </ToolbarButton>
      </DropdownMenuTrigger>

      <DropdownMenuContent className="min-w-[180px]" align="start">
        <DropdownMenuRadioGroup
          value={value}
          onValueChange={(newValue) => {
            // Only toggle if we have the callback
            if (onEditModeToggle) {
              if (newValue === 'viewing' && isEditMode) {
                // Switch to view mode
                onEditModeToggle();
              } else if (newValue === 'editing' && !isEditMode) {
                // Switch to edit mode
                onEditModeToggle();
              }
            }
            setOpen(false);
          }}
        >
          <DropdownMenuRadioItem
            className="pl-2 *:first:[span]:hidden *:[svg]:text-muted-foreground"
            value="editing"
            disabled={doc?.status === 'archived' || !onEditModeToggle}
          >
            <Indicator />
            {item.editing.icon}
            {item.editing.label}
          </DropdownMenuRadioItem>

          <DropdownMenuRadioItem
            className="pl-2 *:first:[span]:hidden *:[svg]:text-muted-foreground"
            value="viewing"
            disabled={!onEditModeToggle}
          >
            <Indicator />
            {item.viewing.icon}
            {item.viewing.label}
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function Indicator() {
  return (
    <span className="pointer-events-none absolute right-2 flex size-3.5 items-center justify-center">
      <DropdownMenuItemIndicator>
        <CheckIcon />
      </DropdownMenuItemIndicator>
    </span>
  );
}
