import { Separator } from '@radix-ui/themes';

type Orientation = 'horizontal' | 'vertical';

interface DraggableDividerProps {
  orientation: Orientation;
  onMouseDown: (e: React.MouseEvent) => void;
}

/**
 * A draggable divider component for resizable split panes.
 * Provides a wider grab area than the visible divider line for easier interaction.
 */
export function DraggableDivider({
  orientation,
  onMouseDown,
}: DraggableDividerProps) {
  const isVertical = orientation === 'vertical';

  return (
    <Separator
      orientation={orientation}
      size="4"
      className={
        isVertical
          ? 'draggable-divider-vertical'
          : 'draggable-divider-horizontal'
      }
      onMouseDown={onMouseDown}
      style={{ cursor: isVertical ? 'col-resize' : 'row-resize' }}
    />
  );
}
