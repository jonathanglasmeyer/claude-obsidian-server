// Platform-agnostic tool visualization utilities
export interface ToolVisualizationProps {
  type: string;
  state: 'input-streaming' | 'input-available' | 'output-available' | 'output-error';
  input?: any;
  output?: string;
  errorText?: string;
}

export interface ToolHeaderProps {
  type: string;
  state: ToolVisualizationProps['state'];
  isCollapsed?: boolean;
  onToggle?: () => void;
}

// Tool visualization styling
export const toolStyles = {
  container: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    marginVertical: 8,
    overflow: 'hidden' as const,
  },
  header: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
  },
  content: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  input: {
    backgroundColor: '#f0f0f0',
    borderRadius: 4,
    padding: 8,
    marginBottom: 8,
  },
  output: {
    backgroundColor: '#e8f5e8',
    borderRadius: 4,
    padding: 8,
  },
  error: {
    backgroundColor: '#fdeaea',
    borderRadius: 4,
    padding: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    fontSize: 12,
  }
};

// Status badge colors
export const getStatusBadgeStyle = (status: ToolVisualizationProps['state']) => {
  const baseStyle = toolStyles.statusBadge;
  
  switch (status) {
    case 'input-streaming':
      return { ...baseStyle, backgroundColor: '#fff3cd', color: '#856404' };
    case 'input-available': 
      return { ...baseStyle, backgroundColor: '#cce5ff', color: '#004085' };
    case 'output-available':
      return { ...baseStyle, backgroundColor: '#d4edda', color: '#155724' };
    case 'output-error':
      return { ...baseStyle, backgroundColor: '#f8d7da', color: '#721c24' };
    default:
      return baseStyle;
  }
};

export const getStatusLabel = (status: ToolVisualizationProps['state']) => {
  switch (status) {
    case 'input-streaming': return 'Pending';
    case 'input-available': return 'Running';
    case 'output-available': return 'Completed';
    case 'output-error': return 'Error';
    default: return 'Unknown';
  }
};