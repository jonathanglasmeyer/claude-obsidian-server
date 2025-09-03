import React from 'react';
import { StyleSheet, useColorScheme } from 'react-native';
import Markdown from 'react-native-markdown-display';

interface MarkdownMessageProps {
  content: string;
  isAssistant?: boolean;
}

export function MarkdownMessage({ content, isAssistant = false }: MarkdownMessageProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  
  const styles = createStyles(isDark, isAssistant);
  
  // MarkdownMessage rendering
  
  return (
    <Markdown style={styles}>
      {content}
    </Markdown>
  );
}

function createStyles(isDark: boolean, isAssistant: boolean) {
  const textColor = isDark 
    ? (isAssistant ? '#E8EAED' : '#333333') 
    : (isAssistant ? '#333333' : '#333333');
  
  const codeBackgroundColor = isDark 
    ? (isAssistant ? '#2D2D30' : '#1A1A1A') 
    : (isAssistant ? '#F5F5F5' : 'rgba(255,255,255,0.1)');
  
  const linkColor = isDark ? '#8AB4F8' : '#1976D2';
  
  return StyleSheet.create({
    body: {
      fontSize: 16,
      lineHeight: 21,
      color: textColor,
      fontFamily: 'System',
    },
    heading1: {
      fontSize: 20,
      fontWeight: 'bold',
      marginVertical: 8,
      color: textColor,
    },
    heading2: {
      fontSize: 18,
      fontWeight: 'bold',
      marginVertical: 6,
      color: textColor,
    },
    heading3: {
      fontSize: 16,
      fontWeight: 'bold',
      marginVertical: 4,
      color: textColor,
    },
    paragraph: {
      marginVertical: 2,
      color: textColor,
      fontSize: 16,
      lineHeight: 21,
    },
    strong: {
      fontWeight: 'bold',
      color: textColor,
    },
    em: {
      fontStyle: 'italic',
      color: textColor,
    },
    code_inline: {
      fontFamily: 'Menlo, Monaco, Consolas, monospace',
      fontSize: 14,
      backgroundColor: codeBackgroundColor,
      paddingHorizontal: 4,
      paddingVertical: 2,
      borderRadius: 3,
      color: textColor,
    },
    code_block: {
      fontFamily: 'Menlo, Monaco, Consolas, monospace',
      fontSize: 13,
      backgroundColor: codeBackgroundColor,
      padding: 12,
      borderRadius: 6,
      marginVertical: 8,
      color: textColor,
      lineHeight: 18,
    },
    fence: {
      fontFamily: 'Menlo, Monaco, Consolas, monospace',
      fontSize: 13,
      backgroundColor: codeBackgroundColor,
      padding: 12,
      borderRadius: 6,
      marginVertical: 8,
      color: textColor,
      lineHeight: 18,
    },
    link: {
      color: linkColor,
      textDecorationLine: 'underline',
    },
    list_item: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginVertical: 2,
    },
    bullet_list_icon: {
      marginLeft: 10,
      marginRight: 10,
      fontSize: 15,
      lineHeight: 20,
      color: textColor,
    },
    ordered_list_icon: {
      marginLeft: 10,
      marginRight: 10,
      fontSize: 15,
      lineHeight: 20,
      color: textColor,
    },
    blockquote: {
      backgroundColor: codeBackgroundColor,
      borderLeftWidth: 4,
      borderLeftColor: linkColor,
      paddingLeft: 12,
      paddingVertical: 8,
      marginVertical: 8,
    },
    table: {
      borderWidth: 1,
      borderColor: isDark ? '#444' : '#DDD',
      marginVertical: 8,
    },
    thead: {
      backgroundColor: codeBackgroundColor,
    },
    tbody: {},
    th: {
      padding: 8,
      borderRightWidth: 1,
      borderRightColor: isDark ? '#444' : '#DDD',
      fontWeight: 'bold',
      color: textColor,
    },
    td: {
      padding: 8,
      borderRightWidth: 1,
      borderRightColor: isDark ? '#444' : '#DDD',
      color: textColor,
    },
    tr: {
      borderBottomWidth: 1,
      borderBottomColor: isDark ? '#444' : '#DDD',
    },
  });
}