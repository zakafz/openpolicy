import * as React from "react";

interface EditorContextValue {
  doc?: any;
  isEditMode?: boolean;
  isSaving?: boolean;
  onEditModeToggle?: () => void;
  onSave?: () => void;
  onCancel?: () => void;
  onRename?: () => void;
  workspace?: any;
}

const EditorContext = React.createContext<EditorContextValue>({});

export function EditorProvider({
  children,
  value,
}: {
  children: React.ReactNode;
  value: EditorContextValue;
}) {
  return (
    <EditorContext.Provider value={value}>{children}</EditorContext.Provider>
  );
}

export function useEditorContext() {
  return React.useContext(EditorContext);
}
