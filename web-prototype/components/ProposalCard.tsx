'use client';

import { useState } from 'react';

interface FileProposal {
  suggestedPath: string;
  content: string;
  status: 'pending' | 'confirmed' | 'modified';
}

interface ProposalCardProps {
  proposal: FileProposal;
  onConfirm: () => void;
  onModify: (path: string) => void;
}

export default function ProposalCard({ proposal, onConfirm, onModify }: ProposalCardProps) {
  const [editPath, setEditPath] = useState(proposal.suggestedPath);
  const [isEditing, setIsEditing] = useState(false);

  const handleModify = () => {
    onModify(editPath);
    setIsEditing(false);
  };

  return (
    <div className="border-l-4 border-blue-500 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-400 rounded-lg p-6 shadow-sm">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-2">
          <span className="text-2xl">📄</span>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            File Organization Proposal
          </h3>
        </div>
        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
          proposal.status === 'pending' 
            ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300'
            : proposal.status === 'confirmed'
            ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300'
            : 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300'
        }`}>
          {proposal.status}
        </span>
      </div>

      {/* File Path */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          📁 Suggested File Path:
        </label>
        {isEditing ? (
          <div className="flex space-x-2">
            <input
              type="text"
              value={editPath}
              onChange={(e) => setEditPath(e.target.value)}
              className="flex-1 p-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white text-sm font-mono"
              autoFocus
            />
            <button
              onClick={handleModify}
              className="px-3 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Save
            </button>
            <button
              onClick={() => {
                setEditPath(proposal.suggestedPath);
                setIsEditing(false);
              }}
              className="px-3 py-2 bg-gray-500 text-white text-sm rounded-md hover:bg-gray-600 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
            >
              Cancel
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between p-3 bg-gray-100 dark:bg-gray-700 rounded-md">
            <code className="text-sm font-mono text-gray-800 dark:text-gray-200">
              {proposal.suggestedPath}
            </code>
            <button
              onClick={() => setIsEditing(true)}
              className="ml-2 p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              title="Edit path"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
          </div>
        )}
      </div>

      {/* Content Preview */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          📝 Content Preview:
        </label>
        <div className="relative">
          <pre className="bg-gray-100 dark:bg-gray-700 p-4 rounded-md text-sm overflow-x-auto max-h-48 overflow-y-auto border">
            <code className="text-gray-800 dark:text-gray-200">
              {proposal.content.length > 500 
                ? proposal.content.slice(0, 500) + '\n\n... (truncated)'
                : proposal.content
              }
            </code>
          </pre>
          {proposal.content.length > 500 && (
            <div className="absolute bottom-2 right-2 bg-white dark:bg-gray-800 px-2 py-1 rounded text-xs text-gray-500 dark:text-gray-400 shadow">
              {proposal.content.length} characters total
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={onConfirm}
          className="flex-1 flex items-center justify-center px-4 py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          Confirm & Save to Vault
        </button>
        
        <button
          onClick={() => setIsEditing(true)}
          className="flex-1 flex items-center justify-center px-4 py-3 bg-yellow-600 text-white font-medium rounded-lg hover:bg-yellow-700 focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 transition-colors"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          Modify Path
        </button>
        
        <button
          className="px-4 py-3 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors"
          onClick={() => {
            if (confirm('Are you sure you want to reject this proposal?')) {
              // Handle rejection - could emit an event or callback
              console.log('Proposal rejected');
            }
          }}
        >
          <svg className="w-5 h-5 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
          Reject
        </button>
      </div>

      {/* Status Info */}
      {proposal.status === 'modified' && (
        <div className="mt-4 p-3 bg-blue-100 dark:bg-blue-900/30 rounded-md">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm text-blue-800 dark:text-blue-200">
              Path has been modified. Click "Confirm & Save to Vault" to proceed with changes.
            </span>
          </div>
        </div>
      )}
    </div>
  );
}