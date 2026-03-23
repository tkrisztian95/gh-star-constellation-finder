import React, { useState, useEffect } from 'react';
import { render, Text, Box, useInput, Newline } from 'ink';

// --- Types ---
interface RepoStatus {
  name: string;
  description: string;
  suggestedList: string;
  insight: string;
}

// --- Main App Component ---
const ConstellationApp = () => {
  const [appState, setAppState] = useState<'SCANNING' | 'ANALYZING' | 'REVIEW' | 'DONE'>('SCANNING');
  const [currentRepo, setCurrentRepo] = useState<RepoStatus | null>(null);

  // Simulate the background work (Fetching from GitHub, sending to AI)
  useEffect(() => {
    if (appState === 'SCANNING') {
      const timer = setTimeout(() => setAppState('ANALYZING'), 2000);
      return () => clearTimeout(timer);
    }

    if (appState === 'ANALYZING') {
      const timer = setTimeout(() => {
        // Mocking the AI response
        setCurrentRepo({
          name: 'vllm-project/vllm',
          description: 'A high-throughput and memory-efficient LLM serving engine',
          suggestedList: 'AI-Infrastructure',
          insight: 'High-throughput serving for LLMs. Matches your Python ecosystem.',
        });
        setAppState('REVIEW');
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [appState]);

  // Handle Keyboard Input during the REVIEW stage
  useInput((input, key) => {
    if (appState !== 'REVIEW') return;

    if (input.toLowerCase() === 'y' || key.return) {
      // Here is where we would trigger the GraphQL Mutation
      setAppState('DONE');
    }
    if (input.toLowerCase() === 'n' || input.toLowerCase() === 's') {
      // Skip logic
      setAppState('DONE');
    }
  });

  // --- UI Rendering ---
  return (
    <Box flexDirection="column" borderStyle="round" borderColor="cyan" padding={1} width={80}>
      {/* Header */}
      <Box justifyContent="space-between" marginBottom={1}>
        <Text color="magenta" bold>✨ gh-star-constellation-finder</Text>
        <Text color="gray">PoC v0.1</Text>
      </Box>

      {/* Dynamic Main Stage */}
      {appState === 'SCANNING' && (
        <Box padding={1}>
          <Text color="yellow">🔭 Scanning GitHub for unmapped stars...</Text>
        </Box>
      )}

      {appState === 'ANALYZING' && (
        <Box padding={1}>
          <Text color="blue">🧠 Analyzing READMEs with LLM...</Text>
        </Box>
      )}

      {appState === 'REVIEW' && currentRepo && (
        <Box flexDirection="column" padding={1} borderStyle="single" borderColor="gray">
          <Text bold color="white">NEW STAR DETECTED: <Text color="green">{currentRepo.name}</Text></Text>
          <Text color="gray">{currentRepo.description}</Text>
          <Newline />
          
          <Text bold color="cyan">AI PROPOSAL:</Text>
          <Text>Move to Native List: <Text color="magenta" bold>[ {currentRepo.suggestedList} ]</Text> (New List)</Text>
          <Newline />
          
          <Text bold color="blue">INSIGHT:</Text>
          <Text italic color="white">"{currentRepo.insight}"</Text>
        </Box>
      )}

      {appState === 'DONE' && (
        <Box padding={1}>
          <Text color="green">✅ Constellations updated! No more unmapped stars.</Text>
        </Box>
      )}

      {/* Footer / Controls */}
      <Box marginTop={1}>
        {appState === 'REVIEW' ? (
          <Text color="gray">[Y / Enter] Accept   [N] Skip   [Ctrl+C] Quit</Text>
        ) : (
          <Text color="gray">Please wait...   [Ctrl+C] Quit</Text>
        )}
      </Box>
    </Box>
  );
};

// Start the TUI
render(<ConstellationApp />);